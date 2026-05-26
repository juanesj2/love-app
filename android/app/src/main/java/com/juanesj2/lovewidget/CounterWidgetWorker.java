package com.juanesj2.lovewidget;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.widget.RemoteViews;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class CounterWidgetWorker extends Worker {

    public CounterWidgetWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        
        String startDateString = prefs.getString("_cap_relationshipStartDate", "");
        if (startDateString == null || startDateString.isEmpty()) {
            startDateString = prefs.getString("relationshipStartDate", "");
        }
        
        String albumId = prefs.getString("_cap_widgetAlbumId", "");
        if (albumId == null || albumId.isEmpty()) {
            albumId = prefs.getString("widgetAlbumId", "feed");
        }
        
        String counterText = "-- Días";
        
        try {
            if (!startDateString.isEmpty()) {
                // Parse the date (ISO 8601 or simple string)
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.getDefault());
                Date startDate = sdf.parse(startDateString);
                
                if (startDate != null && startDate.before(new Date())) {
                    long diffInMillis = new Date().getTime() - startDate.getTime();
                    long days = diffInMillis / (1000 * 60 * 60 * 24);
                    long years = days / 365;
                    long remainingDays = days % 365;
                    
                    if (years > 0) {
                        counterText = years + " Años\n" + remainingDays + " Días";
                    } else {
                        counterText = days + " Días";
                    }
                }
            }
            
            prefs.edit().putString("lastCounterText", counterText).apply();

            // Fetch latest photo from Laravel API
            String photoUrl = fetchLatestPhotoUrl(albumId);
            Bitmap photoBitmap = null;
            if (photoUrl != null && !photoUrl.isEmpty()) {
                photoBitmap = fetchBitmap("https://enfoca.alwaysdata.net/storage/" + photoUrl);
            }
            
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            
            // 1. Update 1x1 Widget
            ComponentName widget1x1 = new ComponentName(context, Counter1x1WidgetProvider.class);
            int[] ids1x1 = appWidgetManager.getAppWidgetIds(widget1x1);
            for (int id : ids1x1) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_counter_1x1);
                views.setTextViewText(R.id.widget_counter_text, counterText);
                appWidgetManager.updateAppWidget(id, views);
            }
            
            // 2. Update Photo Widget
            ComponentName widgetPhoto = new ComponentName(context, CounterPhotoWidgetProvider.class);
            int[] idsPhoto = appWidgetManager.getAppWidgetIds(widgetPhoto);
            for (int id : idsPhoto) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_counter_photo);
                views.setTextViewText(R.id.widget_counter_text_large, counterText);
                if (photoBitmap != null) {
                    views.setImageViewBitmap(R.id.widget_photo_large, photoBitmap);
                    views.setTextViewText(R.id.widget_photo_title, "");
                } else {
                    views.setTextViewText(R.id.widget_photo_title, "Sin fotos");
                }
                appWidgetManager.updateAppWidget(id, views);
            }
            
            return Result.success();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Result.retry();
        }
    }
    
    private String fetchLatestPhotoUrl(String albumId) {
        try {
            String urlStr = "https://enfoca.alwaysdata.net/api/love-album/photos";
            if (albumId != null && !albumId.isEmpty() && !albumId.equals("feed")) {
                urlStr += "?album_id=" + albumId;
            }
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            
            // Use basic auth just in case (the environment API uses basic auth or token? we need the token)
            // Wait, we can't easily get the token here if it's stored in Capacitor preferences.
            // Let's assume the API might need auth. If it needs auth, we read it from preferences.
            Context context = getApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String token = prefs.getString("_cap_auth_token", "");
            if (token == null || token.isEmpty()) {
                token = prefs.getString("auth_token", "");
            }
            if (!token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }
            
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String inputLine;
            StringBuilder content = new StringBuilder();
            while ((inputLine = in.readLine()) != null) {
                content.append(inputLine);
            }
            in.close();
            conn.disconnect();
            
            JSONArray photos = new JSONArray(content.toString());
            if (photos.length() > 0) {
                // If feed, return first photo (they are ordered by latest)
                // If specific album, we should filter. For now, just return latest photo overall.
                // Or try to pick a random one? Let's just pick a random one from the latest 10 to give a "carousel" feel.
                int maxIndex = Math.min(10, photos.length());
                int randomIndex = (int)(Math.random() * maxIndex);
                JSONObject photo = photos.getJSONObject(randomIndex);
                return photo.getString("image_path");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
    
    private Bitmap fetchBitmap(String urlString) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setDoInput(true);
            conn.connect();
            return BitmapFactory.decodeStream(conn.getInputStream());
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
