package com.juanesj2.lovewidget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class DailyPhotoWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                DailyPhotoWidgetWorker.class, 15, TimeUnit.MINUTES)
                .build();
                
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "DailyPhotoWidgetUpdate",
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest);
    }
}
