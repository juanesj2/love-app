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

public class Counter1x1WidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        updateWidgetFromCache(context, appWidgetManager, appWidgetIds);
        
        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                CounterWidgetWorker.class, 15, TimeUnit.MINUTES)
                .build();
                
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "CounterWidgetUpdate",
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest);
    }
    
    public static void updateWidgetFromCache(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String counterText = prefs.getString("lastCounterText", "-- Días");
        
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_counter_1x1);
            views.setTextViewText(R.id.widget_counter_text, counterText);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
