package com.juanesj2.lovewidget;

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
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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
        String myUserId = prefs.getString("_cap_myUserId", "");
        if (myUserId == null || myUserId.isEmpty()) {
            myUserId = prefs.getString("myUserId", "juan");
        }
        String partnerId = myUserId.equals("juan") ? "roberta" : "juan";
        
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
                     
                // Calculate center point between the two locations for the map background
                double centerLat = (myLoc.getLatitude() + partnerLoc.getLatitude()) / 2.0;
                double centerLon = (myLoc.getLongitude() + partnerLoc.getLongitude()) / 2.0;
                int zoom = calculateZoom(distance);
                
                // Fetch dark map background from OSM/CartoDB dark tiles via a static map service
                String mapUrl = String.format(Locale.US,
                    "https://maps.geoapify.com/v1/staticmap?style=dark-matter-brown&width=600&height=400&center=lonlat:%f,%f&zoom=%d&apiKey=placeholder",
                    centerLon, centerLat, zoom);
                // Fallback: use a simple dark tile from CartoDB
                int tileX = lonToTile(centerLon, zoom);
                int tileY = latToTile(centerLat, zoom);
                String tileUrl = String.format(Locale.US,
                    "https://a.basemaps.cartocdn.com/dark_all/%d/%d/%d@2x.png",
                    zoom, tileX, tileY);
                Bitmap mapBitmap = fetchBitmap(tileUrl);

                // Fetch avatars from Firestore
                String partnerAvatarUrl = fetchAvatar(partnerId);
                String myAvatarUrl = fetchAvatar(myUserId);

                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                ComponentName thisWidget = new ComponentName(context, LoveWidgetProvider.class);
                int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

                for (int appWidgetId : appWidgetIds) {
                    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
                    views.setTextViewText(R.id.widget_distance, distanceText);
                    views.setTextViewText(R.id.widget_time, timeText);
                    // Set map background
                    if (mapBitmap != null) {
                        views.setImageViewBitmap(R.id.widget_map_bg, mapBitmap);
                    }
                    // Load partner avatar into widget_map ImageView (right)
                    if (partnerAvatarUrl != null && !partnerAvatarUrl.isEmpty()) {
                        Bitmap partnerBitmap = partnerAvatarUrl.startsWith("data:")
                            ? decodeBase64Bitmap(partnerAvatarUrl)
                            : fetchBitmap(partnerAvatarUrl);
                        if (partnerBitmap != null) views.setImageViewBitmap(R.id.widget_map, partnerBitmap);
                    }
                    // Load my avatar into widget_my_avatar ImageView (left)
                    if (myAvatarUrl != null && !myAvatarUrl.isEmpty()) {
                        Bitmap myBitmap = myAvatarUrl.startsWith("data:")
                            ? decodeBase64Bitmap(myAvatarUrl)
                            : fetchBitmap(myAvatarUrl);
                        if (myBitmap != null) views.setImageViewBitmap(R.id.widget_my_avatar, myBitmap);
                    }
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
    
    private String fetchAvatar(String userId) {
        try {
            URL url = new URL("https://firestore.googleapis.com/v1/projects/love-widget-app-ec037/databases/(default)/documents/locations/" + userId);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String inputLine;
            StringBuilder content = new StringBuilder();
            while ((inputLine = in.readLine()) != null) content.append(inputLine);
            in.close();
            conn.disconnect();
            
            JSONObject json = new JSONObject(content.toString());
            JSONObject fields = json.optJSONObject("fields");
            if (fields != null && fields.has("avatar")) {
                return fields.getJSONObject("avatar").optString("stringValue", "");
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
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android) LoveWidget");
            conn.setDoInput(true);
            conn.connect();
            return BitmapFactory.decodeStream(conn.getInputStream());
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
    
    private int calculateZoom(float distanceMeters) {
        if (distanceMeters < 500) return 15;
        if (distanceMeters < 2000) return 13;
        if (distanceMeters < 10000) return 11;
        if (distanceMeters < 50000) return 9;
        if (distanceMeters < 200000) return 7;
        if (distanceMeters < 1000000) return 5;
        return 3;
    }
    
    private int lonToTile(double lon, int zoom) {
        return (int) Math.floor((lon + 180.0) / 360.0 * (1 << zoom));
    }
    
    private int latToTile(double lat, int zoom) {
        return (int) Math.floor((1 - Math.log(Math.tan(Math.toRadians(lat)) + 1 / Math.cos(Math.toRadians(lat))) / Math.PI) / 2 * (1 << zoom));
    }

    private Bitmap decodeBase64Bitmap(String base64Str) {
        try {
            if (base64Str.startsWith("data:")) {
                int commaIndex = base64Str.indexOf(",");
                if (commaIndex != -1) {
                    base64Str = base64Str.substring(commaIndex + 1);
                }
            }
            byte[] decodedBytes = android.util.Base64.decode(base64Str, android.util.Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
