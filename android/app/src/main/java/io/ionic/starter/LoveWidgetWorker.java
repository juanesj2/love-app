package io.ionic.starter;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.widget.RemoteViews;
import android.location.Location;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class LoveWidgetWorker extends Worker {

    public LoveWidgetWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String myUserId = prefs.getString("myUserId", "juan");
        String partnerId = prefs.getString("partnerId", "roberta");
        
        try {
            Location myLoc = fetchLocation(myUserId);
            Location partnerLoc = fetchLocation(partnerId);
            
            if (myLoc != null && partnerLoc != null) {
                float distance = myLoc.distanceTo(partnerLoc);
                String distanceText = "";
                if (distance < 50) {
                    distanceText = "¡Estáis juntos! ❤️";
                } else if (distance > 1000) {
                    distanceText = String.format(Locale.getDefault(), "A %.1f km de ti", distance / 1000f);
                } else {
                    distanceText = String.format(Locale.getDefault(), "A %d metros de ti", (int)distance);
                }
                
                SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
                String timeText = "Act: " + sdf.format(new Date());
                
                prefs.edit()
                     .putString("lastDistance", distanceText)
                     .putString("lastTime", timeText)
                     .apply();
                     
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                ComponentName thisWidget = new ComponentName(context, LoveWidgetProvider.class);
                int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
                
                for (int appWidgetId : appWidgetIds) {
                    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
                    views.setTextViewText(R.id.widget_distance, distanceText);
                    views.setTextViewText(R.id.widget_time, timeText);
                    appWidgetManager.updateAppWidget(appWidgetId, views);
                }
                
                return Result.success();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        return Result.retry();
    }
    
    private Location fetchLocation(String userId) throws Exception {
        URL url = new URL("https://firestore.googleapis.com/v1/projects/love-widget-app-ec037/databases/(default)/documents/locations/" + userId);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        
        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        String inputLine;
        StringBuilder content = new StringBuilder();
        while ((inputLine = in.readLine()) != null) {
            content.append(inputLine);
        }
        in.close();
        conn.disconnect();
        
        JSONObject json = new JSONObject(content.toString());
        JSONObject fields = json.getJSONObject("fields");
        JSONObject position = fields.getJSONObject("position").getJSONObject("geoPointValue");
        
        double lat = position.getDouble("latitude");
        double lng = position.getDouble("longitude");
        
        Location loc = new Location("");
        loc.setLatitude(lat);
        loc.setLongitude(lng);
        return loc;
    }
}
