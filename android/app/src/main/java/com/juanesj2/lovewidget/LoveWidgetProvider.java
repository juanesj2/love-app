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

public class LoveWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        updateWidgetFromCache(context, appWidgetManager, appWidgetIds);
        
        // Android mínimo permite 15 minutos de intervalo
        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                LoveWidgetWorker.class, 15, TimeUnit.MINUTES)
                .build();
                
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "LoveWidgetUpdate",
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest);
    }
    
    public static void updateWidgetFromCache(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String lastTime = prefs.getString("lastTime", "Actualizando...");
        
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
            views.setTextViewText(R.id.widget_time, lastTime);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
