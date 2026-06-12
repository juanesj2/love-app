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
        
        if (intent != null && intent.hasExtra("open_album_id")) {
            String openAlbumId = intent.getStringExtra("open_album_id");
            if (openAlbumId != null && !openAlbumId.isEmpty()) {
                android.content.SharedPreferences capPrefs = getSharedPreferences("CapacitorStorage", android.content.Context.MODE_PRIVATE);
                capPrefs.edit().putString("widget_open_album_id", openAlbumId).apply();
            }
            intent.removeExtra("open_album_id");
        }
        
        if (intent != null && intent.hasExtra("action")) {
            String action = intent.getStringExtra("action");
            if (action != null && !action.isEmpty()) {
                android.content.SharedPreferences capPrefs = getSharedPreferences("CapacitorStorage", android.content.Context.MODE_PRIVATE);
                capPrefs.edit().putString("widget_action", action).apply();
            }
            intent.removeExtra("action");
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
