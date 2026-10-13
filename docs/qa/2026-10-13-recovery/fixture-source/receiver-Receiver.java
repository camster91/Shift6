package com.shift6.qa.receiver;
import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.content.Intent;
import android.widget.TextView;
import java.io.*;
import org.json.JSONObject;
public class Receiver extends Activity {
 public void onCreate(Bundle state) {
  super.onCreate(state);
  TextView view=new TextView(this);view.setPadding(24,48,24,24);view.setTextSize(22);setContentView(view);
  try {
   Uri uri=getIntent().getParcelableExtra(Intent.EXTRA_STREAM);
   if(uri==null)throw new IOException("No shared JSON stream");
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();
   try(InputStream stream=getContentResolver().openInputStream(uri)){
    byte[] buffer=new byte[8192];int count;
    while((count=stream.read(buffer))>0){bytes.write(buffer,0,count);if(bytes.size()>50000000)throw new IOException("Test export too large");}
   }
   JSONObject document=new JSONObject(bytes.toString("UTF-8"));
   try(FileOutputStream output=openFileOutput("received.json",MODE_PRIVATE)){output.write(bytes.toByteArray());}
   view.setText("Received and opened JSON outside SHIFT6\nSchema: "+document.getInt("schemaVersion")+"\nRecords: "+document.getJSONObject("summary").getInt("totalRecordCount")+"\nBytes: "+bytes.size()+"\nLocal synthetic QA copy retained independently.");
  }catch(Exception e){view.setText("Export read failed: "+e.getMessage());}
 }
}
