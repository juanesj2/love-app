package com.juanesj2.lovewidget;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onResume() {
        super.onResume();
        handleWidgetIntent();
        triggerImmediateWidgetUpdates();
    }
    
    @Override
    public void onPause() {
        super.onPause();
        triggerImmediateWidgetUpdates();
    }
    
    @Override
    public void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent); // Update the intent so onResume can catch it if app was alive
    }

    private void handleWidgetIntent() {
        android.content.Intent intent = getIntent();
        if (intent != null && intent.hasExtra("open_tab")) {
            String openTab = intent.getStringExtra("open_tab");
            if (openTab != null && !openTab.isEmpty()) {
                android.content.SharedPreferences capPrefs = getSharedPreferences("CapacitorStorage", android.content.Context.MODE_PRIVATE);
                capPrefs.edit().putString("widget_open_tab", openTab).apply();
            }
            // Remove it so it doesn't trigger again on rotation/etc.
            intent.removeExtra("open_tab");
        }
    }

    private void triggerImmediateWidgetUpdates() {
        try {
            WorkManager wm = WorkManager.getInstance(getApplicationContext());
            wm.enqueue(new OneTimeWorkRequest.Builder(LoveWidgetWorker.class).build());
            wm.enqueue(new OneTimeWorkRequest.Builder(DailyPhotoWidgetWorker.class).build());
            wm.enqueue(new OneTimeWorkRequest.Builder(CounterWidgetWorker.class).build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
