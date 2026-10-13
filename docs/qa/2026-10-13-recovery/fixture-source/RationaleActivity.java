package com.shift6.qa.healthseed;
import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
public class RationaleActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state); TextView text=new TextView(this); text.setPadding(24,48,24,24); text.setTextSize(20);
    text.setText("SHIFT6 QA fixture privacy\nSynthetic emulator-only records. No actual activity occurred. Steps and exercise read/write permissions support public-API QA. No network permission, remote storage, analytics or physical-device operation. Writes happen only after Seed; cleanup addresses only this fixture's tracked client record IDs. Permission can be revoked through Android settings."); setContentView(text);
  }
}
