package com.juanesj2.lovewidget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.Toast;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

public class PokeWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_POKE = "com.juanesj2.lovewidget.ACTION_POKE";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_poke);
            
            Intent intent = new Intent(context, PokeWidgetProvider.class);
            intent.setAction(ACTION_POKE);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            
            views.setOnClickPendingIntent(R.id.widget_poke_root, pendingIntent);
            
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_POKE.equals(intent.getAction())) {
            Toast.makeText(context, "Enviando zumbido...", Toast.LENGTH_SHORT).show();
            
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(PokeWorker.class).build();
            WorkManager.getInstance(context).enqueue(workRequest);
        }
    }
}
