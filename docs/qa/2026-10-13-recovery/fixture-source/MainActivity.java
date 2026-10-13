package com.shift6.qa.healthseed;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.health.connect.*;
import android.health.connect.datatypes.Device;
import android.health.connect.datatypes.ExerciseSessionRecord;
import android.health.connect.datatypes.ExerciseSessionType;
import android.health.connect.datatypes.Metadata;
import android.health.connect.datatypes.Record;
import android.health.connect.datatypes.StepsRecord;
import android.os.Build;
import android.os.Bundle;
import android.os.OutcomeReceiver;
import android.widget.*;
import java.time.*;
import java.util.*;

/** Offline synthetic emulator-only fixture. No records are written on launch. */
public class MainActivity extends Activity {
  private static final String[] PERMISSIONS = {
    "android.permission.health.READ_STEPS", "android.permission.health.WRITE_STEPS",
    "android.permission.health.READ_EXERCISE", "android.permission.health.WRITE_EXERCISE"
  };
  private TextView output;
  private HealthConnectManager health;
  private boolean busy;
  private boolean sourceA() { return getPackageName().endsWith(".a"); }
  private boolean emulator() {
    return Build.VERSION.SDK_INT >= 34 &&
      ("ranchu".equals(Build.HARDWARE) || "goldfish".equals(Build.HARDWARE));
  }
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout column = new LinearLayout(this); column.setOrientation(1); column.setPadding(24,32,24,32);
    ScrollView scroll = new ScrollView(this); scroll.addView(column); setContentView(scroll);
    TextView title = new TextView(this); title.setTextSize(23);
    title.setText("SHIFT6 QA Health Seed " + (sourceA() ? "A / PHONE" : "B / WATCH") +
      "\nSYNTHETIC ONLY: NO ACTIVITY OCCURRED\nEmulator-only, no network. Permissions and writes require explicit actions.");
    column.addView(title);
    output = new TextView(this); output.setTextSize(17);
    if (!emulator()) { column.addView(output); log("BLOCKED: hardware="+Build.HARDWARE+". This fixture never operates on physical phones."); return; }
    health = getSystemService(HealthConnectManager.class);
    button(column,"Request Health permissions",() -> requestPermissions(PERMISSIONS,7));
    button(column,"Open OS Health permission settings",() -> {
      try { startActivity(new Intent(HealthConnectManager.ACTION_MANAGE_HEALTH_PERMISSIONS).putExtra(Intent.EXTRA_PACKAGE_NAME,getPackageName())); }
      catch(Exception e) { log("Settings unavailable: "+e); }
    });
    button(column,"Seed synthetic records",this::seed);
    button(column,"Show platform steps aggregate",this::aggregate);
    button(column,"Delete ONLY this fixture's client record IDs",this::deleteOwn);
    column.addView(output);
    log("Ready. UTC now="+Instant.now()+"; hardware="+Build.HARDWARE+"; permission="+granted());
  }
  private void button(LinearLayout column,String name,Runnable action) {
    Button b=new Button(this); b.setText(name); b.setOnClickListener(v -> {
      if (!emulator()) { log("BLOCKED: emulator guard"); return; }
      if (busy) { log("Wait for the current operation."); return; }
      action.run();
    }); column.addView(b);
  }
  private void log(String message) { output.setText(message); android.util.Log.i("Shift6HealthSeed",getPackageName()+": "+message); }
  private boolean granted() { for(String p:PERMISSIONS) if(checkSelfPermission(p)!=PackageManager.PERMISSION_GRANTED) return false; return true; }
  private boolean ready() { if(!emulator() || health==null) { log("Emulator Health Connect unavailable."); return false; } if(!granted()) { log("Grant read/write steps and exercise through the OS permission action first."); return false; } return true; }
  @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants) { super.onRequestPermissionsResult(request,permissions,grants); log("OS permission result: "+granted()+". No records written."); }
  private String id(String day,String suffix) { return getPackageName()+":synthetic:v1:"+day+":"+suffix; }
  private Metadata metadata(String day,String suffix) {
    return new Metadata.Builder().setClientRecordId(id(day,suffix)).setClientRecordVersion(1)
      .setRecordingMethod(Metadata.RECORDING_METHOD_AUTOMATICALLY_RECORDED)
      .setDevice(new Device.Builder().setManufacturer("SHIFT6 synthetic QA")
        .setModel(sourceA()?"Synthetic phone":"Synthetic watch")
        .setType(sourceA()?Device.DEVICE_TYPE_PHONE:Device.DEVICE_TYPE_WATCH).build()).build();
  }
  private void seed() {
    if(!ready()) return;
    String day=LocalDate.now(ZoneOffset.UTC).minusDays(1).toString();
    Instant midnight=LocalDate.parse(day).atStartOfDay().toInstant(ZoneOffset.UTC);
    List<Record> records=new ArrayList<>();
    records.add(new StepsRecord.Builder(metadata(day,"steps"),midnight.plusSeconds(43200),midnight.plusSeconds(46800),1000)
      .setStartZoneOffset(ZoneOffset.UTC).setEndZoneOffset(ZoneOffset.UTC).build());
    if(sourceA()) for(int i=0;i<1001;i++) {
      Instant start=midnight.plusSeconds(i*60L);
      records.add(new ExerciseSessionRecord.Builder(metadata(day,"exercise-"+i),start,start.plusSeconds(60),ExerciseSessionType.EXERCISE_SESSION_TYPE_OTHER_WORKOUT)
        .setTitle("SYNTHETIC QA ONLY "+i).setStartZoneOffset(ZoneOffset.UTC).setEndZoneOffset(ZoneOffset.UTC).build());
    }
    // Track intended IDs before first write so partial batches can be cleaned up safely.
    Set<String> days=new HashSet<>(getPreferences(0).getStringSet("fixtureDays",Collections.emptySet()));
    days.add(day); getPreferences(0).edit().putStringSet("fixtureDays",days).commit();
    busy=true; insertBatch(records,0,day);
  }
  private void insertBatch(List<Record> records,int offset,String day) {
    if(offset>=records.size()) { busy=false; log("Synthetic seed finished: "+records.size()+" intended records; UTC day="+day+". Stable IDs/version1 make repeat seed idempotent. No activity occurred."); return; }
    int end=Math.min(offset+500,records.size());
    health.insertRecords(new ArrayList<>(records.subList(offset,end)),getMainExecutor(),new OutcomeReceiver<InsertRecordsResponse,HealthConnectException>() {
      public void onResult(InsertRecordsResponse result) { log("Inserted batch "+offset+".."+end+"; returned="+result.getRecords().size()); insertBatch(records,end,day); }
      public void onError(HealthConnectException e) { busy=false; log("Seed interrupted after "+offset+" intended records: "+e+". Own-ID cleanup remains available."); }
    });
  }
  private TimeInstantRangeFilter range() {
    Instant start=LocalDate.now(ZoneOffset.UTC).minusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    return new TimeInstantRangeFilter.Builder().setStartTime(start).setEndTime(start.plusSeconds(86400)).build();
  }
  private void aggregate() {
    if(!ready()) return; busy=true;
    AggregateRecordsRequest<Long> request=new AggregateRecordsRequest.Builder<Long>(range()).addAggregationType(StepsRecord.STEPS_COUNT_TOTAL).build();
    health.aggregate(request,getMainExecutor(),new OutcomeReceiver<AggregateRecordsResponse<Long>,HealthConnectException>() {
      public void onResult(AggregateRecordsResponse<Long> r) { busy=false; log("Independent platform STEPS_COUNT_TOTAL yesterday UTC="+r.get(StepsRecord.STEPS_COUNT_TOTAL)+"; origins="+r.getDataOrigins(StepsRecord.STEPS_COUNT_TOTAL)+". Compare this platform result against SHIFT6; do not assume a total."); }
      public void onError(HealthConnectException e) { busy=false; log("Aggregate failed: "+e); }
    });
  }
  private void deleteOwn() {
    if(!ready()) return;
    List<RecordIdFilter> filters=new ArrayList<>();
    for(String day:getPreferences(0).getStringSet("fixtureDays",Collections.emptySet())) {
      filters.add(RecordIdFilter.fromClientRecordId(StepsRecord.class,id(day,"steps")));
      if(sourceA()) for(int i=0;i<1001;i++) filters.add(RecordIdFilter.fromClientRecordId(ExerciseSessionRecord.class,id(day,"exercise-"+i)));
    }
    busy=true; deleteBatch(filters,0);
  }
  private void deleteBatch(List<RecordIdFilter> filters,int offset) {
    if(offset>=filters.size()) { busy=false; getPreferences(0).edit().remove("fixtureDays").commit(); log("Cleanup finished for ONLY "+filters.size()+" known fixture client IDs. No global/time-range health deletion was used."); return; }
    int end=Math.min(offset+500,filters.size());
    health.deleteRecords(new ArrayList<>(filters.subList(offset,end)),getMainExecutor(),new OutcomeReceiver<Void,HealthConnectException>() {
      public void onResult(Void ignored) { deleteBatch(filters,end); }
      public void onError(HealthConnectException e) { busy=false; log("Own-ID cleanup interrupted: "+e+". Tracked IDs retained for retry."); }
    });
  }
}
