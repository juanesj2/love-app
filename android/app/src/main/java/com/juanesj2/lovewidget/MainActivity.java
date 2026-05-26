package com.juanesj2.lovewidget;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onResume() {
        super.onResume();
        triggerImmediateWidgetUpdates();
    }
    
    @Override
    public void onPause() {
        super.onPause();
        triggerImmediateWidgetUpdates();
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
