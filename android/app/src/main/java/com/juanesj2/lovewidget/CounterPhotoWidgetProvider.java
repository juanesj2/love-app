package com.juanesj2.lovewidget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingWorkPolicy;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class CounterPhotoWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        updateWidgetFromCache(context, appWidgetManager, appWidgetIds);
        
        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(
                CounterWidgetWorker.class)
                .build();
                
        WorkManager.getInstance(context).enqueueUniqueWork(
                "CounterWidgetUpdate",
                ExistingWorkPolicy.REPLACE,
                workRequest);
    }
    
    public static void updateWidgetFromCache(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String counterText = prefs.getString("lastCounterText", "-- Días");
        
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_counter_photo);
            views.setTextViewText(R.id.widget_counter_text_large, counterText);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
