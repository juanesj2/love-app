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
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.DashPathEffect;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.util.Log;

import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class LoveWidgetWorker extends Worker {

    private static final String API_BASE = "https://enfoca.alwaysdata.net/api";

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
        
        String token = readToken(context);

        try {
            Location myLoc = fetchLocation(myUserId);
            Location partnerLoc = fetchLocation(partnerId);
            
            if (myLoc != null && partnerLoc != null) {
                float distance = myLoc.distanceTo(partnerLoc);
                String distanceText = "";
                if (distance < 50) {
                    distanceText = "¡Estáis juntos! ❤️";
                } else if (distance > 1000) {
                    distanceText = String.format(Locale.getDefault(), "%.1f km", distance / 1000f);
                } else {
                    distanceText = String.format(Locale.getDefault(), "%d m", (int)distance);
                }
                
                SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
                String timeText = "Act: " + sdf.format(new Date());
                
                prefs.edit()
                     .putString("lastDistance", distanceText)
                     .putString("lastTime", timeText)
                     .apply();
                     
                double centerLat = (myLoc.getLatitude() + partnerLoc.getLatitude()) / 2.0;
                double centerLon = (myLoc.getLongitude() + partnerLoc.getLongitude()) / 2.0;
                int zoom = calculateZoom(distance);
                
                // Fetch dark map background
                int tileX = lonToTile(centerLon, zoom);
                int tileY = latToTile(centerLat, zoom);
                String tileUrl = String.format(Locale.US,
                    "https://a.basemaps.cartocdn.com/dark_all/%d/%d/%d@2x.png",
                    zoom, tileX, tileY);
                Bitmap mapBitmap = fetchBitmap(tileUrl);

                if (mapBitmap != null) {
                    // Create mutable bitmap to draw on
                    Bitmap mutableBitmap = mapBitmap.copy(Bitmap.Config.ARGB_8888, true);
                    Canvas canvas = new Canvas(mutableBitmap);

                    // Fetch avatars
                    String partnerAvatarUrl = fetchAvatar(partnerId);
                    String myAvatarUrl = fetchAvatar(myUserId);
                    Bitmap myAvatarBitmap = null;
                    Bitmap partnerAvatarBitmap = null;
                    
                    if (myAvatarUrl != null) {
                        myAvatarBitmap = myAvatarUrl.startsWith("data:") ? decodeBase64Bitmap(myAvatarUrl) : fetchBitmap(myAvatarUrl);
                    }
                    if (partnerAvatarUrl != null) {
                        partnerAvatarBitmap = partnerAvatarUrl.startsWith("data:") ? decodeBase64Bitmap(partnerAvatarUrl) : fetchBitmap(partnerAvatarUrl);
                    }

                    // Fetch moods
                    String myMood = "";
                    String partnerMood = "";
                    if (token != null && !token.isEmpty()) {
                        JSONObject info = fetchCoupleInfo(token);
                        if (info != null) {
                            myMood = info.optString("my_mood", "");
                            partnerMood = info.optString("partner_mood", "");
                        }
                    }

                    // Calculate pixel coordinates
                    int mapWidth = mutableBitmap.getWidth(); // Should be 512 for CartoDB @2x
                    int mapHeight = mutableBitmap.getHeight();
                    
                    double scale = 256 * Math.pow(2, zoom) * 2; // *2 because @2x tile is 512x512
                    
                    // We need to find the exact pixel coordinates on this specific tile
                    // The tile is at tileX, tileY
                    double tileStartLon = tileToLon(tileX, zoom);
                    double tileStartLat = tileToLat(tileY, zoom);
                    
                    int myX = (int) (lonToPixelX(myLoc.getLongitude(), scale) - lonToPixelX(tileStartLon, scale));
                    int myY = (int) (latToPixelY(myLoc.getLatitude(), scale) - latToPixelY(tileStartLat, scale));
                    
                    int partnerX = (int) (lonToPixelX(partnerLoc.getLongitude(), scale) - lonToPixelX(tileStartLon, scale));
                    int partnerY = (int) (latToPixelY(partnerLoc.getLatitude(), scale) - latToPixelY(tileStartLat, scale));

                    // Clamp to visible area if out of bounds (approximate fallback)
                    myX = Math.max(50, Math.min(mapWidth - 50, myX));
                    myY = Math.max(50, Math.min(mapHeight - 50, myY));
                    partnerX = Math.max(50, Math.min(mapWidth - 50, partnerX));
                    partnerY = Math.max(50, Math.min(mapHeight - 50, partnerY));

                    // Draw Line
                    if (distance >= 50) {
                        Paint linePaint = new Paint();
                        linePaint.setColor(Color.WHITE);
                        linePaint.setStrokeWidth(6f);
                        linePaint.setStyle(Paint.Style.STROKE);
                        linePaint.setPathEffect(new DashPathEffect(new float[]{15f, 15f}, 0));
                        linePaint.setAntiAlias(true);
                        canvas.drawLine(myX, myY, partnerX, partnerY, linePaint);
                    }

                    // Draw Distance Pill
                    if (distance >= 50) {
                        Paint pillPaint = new Paint();
                        pillPaint.setColor(Color.WHITE);
                        pillPaint.setAntiAlias(true);
                        
                        Paint textPaint = new Paint();
                        textPaint.setColor(Color.parseColor("#333333"));
                        textPaint.setTextSize(34f);
                        textPaint.setFakeBoldText(true);
                        textPaint.setAntiAlias(true);
                        textPaint.setTextAlign(Paint.Align.CENTER);
                        
                        Rect textBounds = new Rect();
                        textPaint.getTextBounds(distanceText, 0, distanceText.length(), textBounds);
                        
                        int pillWidth = textBounds.width() + 60;
                        int pillHeight = textBounds.height() + 30;
                        
                        int midX = (myX + partnerX) / 2;
                        int midY = (myY + partnerY) / 2;
                        
                        RectF pillRect = new RectF(midX - pillWidth/2f, midY - pillHeight/2f, midX + pillWidth/2f, midY + pillHeight/2f);
                        canvas.drawRoundRect(pillRect, 30f, 30f, pillPaint);
                        
                        canvas.drawText(distanceText, midX, midY - textBounds.exactCenterY(), textPaint);
                    } else {
                        // Draw just distance pill in center of map
                        Paint pillPaint = new Paint();
                        pillPaint.setColor(Color.parseColor("#FF4D6D"));
                        pillPaint.setAntiAlias(true);
                        
                        Paint textPaint = new Paint();
                        textPaint.setColor(Color.WHITE);
                        textPaint.setTextSize(34f);
                        textPaint.setFakeBoldText(true);
                        textPaint.setAntiAlias(true);
                        textPaint.setTextAlign(Paint.Align.CENTER);
                        
                        Rect textBounds = new Rect();
                        textPaint.getTextBounds(distanceText, 0, distanceText.length(), textBounds);
                        
                        int pillWidth = textBounds.width() + 60;
                        int pillHeight = textBounds.height() + 30;
                        
                        int midX = mapWidth / 2;
                        int midY = mapHeight / 2;
                        
                        RectF pillRect = new RectF(midX - pillWidth/2f, midY - pillHeight/2f, midX + pillWidth/2f, midY + pillHeight/2f);
                        canvas.drawRoundRect(pillRect, 30f, 30f, pillPaint);
                        canvas.drawText(distanceText, midX, midY - textBounds.exactCenterY(), textPaint);
                    }

                    // Draw Avatars
                    if (myAvatarBitmap != null) {
                        Bitmap circularMy = getCircularBitmapWithBorder(myAvatarBitmap, 120);
                        canvas.drawBitmap(circularMy, myX - 60, myY - 60, null);
                        drawMoodBadge(canvas, myMood, myX, myY, 60);
                    }
                    if (partnerAvatarBitmap != null) {
                        Bitmap circularPartner = getCircularBitmapWithBorder(partnerAvatarBitmap, 120);
                        canvas.drawBitmap(circularPartner, partnerX - 60, partnerY - 60, null);
                        drawMoodBadge(canvas, partnerMood, partnerX, partnerY, 60);
                    }

                    // Update Widget
                    AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                    ComponentName thisWidget = new ComponentName(context, LoveWidgetProvider.class);
                    int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

                    for (int appWidgetId : appWidgetIds) {
                        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
                        views.setImageViewBitmap(R.id.widget_map_bg, mutableBitmap);
                        views.setTextViewText(R.id.widget_time, timeText);
                        appWidgetManager.updateAppWidget(appWidgetId, views);
                    }
                    
                    return Result.success();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        return Result.retry();
    }

    private void drawMoodBadge(Canvas canvas, String mood, int avatarX, int avatarY, int radius) {
        if (mood == null || mood.isEmpty()) return;
        
        int badgeX = (int)(avatarX + radius * 0.7); 
        int badgeY = (int)(avatarY - radius * 0.7);
        
        Paint circlePaint = new Paint();
        circlePaint.setColor(Color.WHITE);
        circlePaint.setAntiAlias(true);
        
        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.parseColor("#FF4D6D"));
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(5f);
        borderPaint.setAntiAlias(true);
        
        canvas.drawCircle(badgeX, badgeY, 24f, circlePaint);
        canvas.drawCircle(badgeX, badgeY, 24f, borderPaint);
        
        Paint emojiPaint = new Paint();
        emojiPaint.setTextSize(30f);
        emojiPaint.setAntiAlias(true);
        emojiPaint.setTextAlign(Paint.Align.CENTER);
        
        Rect textBounds = new Rect();
        emojiPaint.getTextBounds(mood, 0, mood.length(), textBounds);
        canvas.drawText(mood, badgeX, badgeY - textBounds.exactCenterY(), emojiPaint);
    }
    
    private Bitmap getCircularBitmapWithBorder(Bitmap bitmap, int size) {
        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        final Paint paint = new Paint();
        final Rect rect = new Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());
        final RectF rectF = new RectF(0, 0, size, size);

        paint.setAntiAlias(true);
        canvas.drawARGB(0, 0, 0, 0);
        paint.setColor(Color.WHITE);
        
        // draw circular image
        canvas.drawCircle(size / 2f, size / 2f, size / 2f - 8f, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rectF, paint);
        
        // draw border
        paint.setXfermode(null);
        paint.setStyle(Paint.Style.STROKE);
        paint.setColor(Color.WHITE);
        paint.setStrokeWidth(8f);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f - 4f, paint);
        
        return output;
    }

    private JSONObject fetchCoupleInfo(String token) {
        try {
            URL url = new URL(API_BASE + "/love-album/info");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(5000);
            
            if (conn.getResponseCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) content.append(line);
                in.close();
                return new JSONObject(content.toString());
            }
            conn.disconnect();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private String readToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("_cap_auth_token", "");
        if (token != null && !token.isEmpty()) return token;
        
        token = prefs.getString("auth_token", "");
        if (token != null && !token.isEmpty()) return token;

        SharedPreferences capPrefs = context.getSharedPreferences("CAPStorage", Context.MODE_PRIVATE);
        token = capPrefs.getString("_cap_auth_token", "");
        if (token != null && !token.isEmpty()) return token;

        return "";
    }

    private double lonToPixelX(double lon, double scale) {
        return (lon + 180.0) / 360.0 * scale;
    }

    private double latToPixelY(double lat, double scale) {
        double sinLat = Math.sin(Math.toRadians(lat));
        return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
    }
    
    private double tileToLon(int x, int z) {
        return x / Math.pow(2.0, z) * 360.0 - 180;
    }

    private double tileToLat(int y, int z) {
        double n = Math.PI - (2.0 * Math.PI * y) / Math.pow(2.0, z);
        return Math.toDegrees(Math.atan(Math.sinh(n)));
    }

    private Location fetchLocation(String userId) throws Exception {
        URL url = new URL("https://firestore.googleapis.com/v1/projects/love-widget-app-ec037/databases/(default)/documents/locations/" + userId);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        
        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        String inputLine;
        StringBuilder content = new StringBuilder();
        while ((inputLine = in.readLine()) != null) content.append(inputLine);
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
        } catch (Exception e) {}
        return null;
    }
    
    private Bitmap fetchBitmap(String urlString) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestProperty("User-Agent", "Mozilla/5.0");
            conn.connect();
            return BitmapFactory.decodeStream(conn.getInputStream());
        } catch (Exception e) {
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
                if (commaIndex != -1) base64Str = base64Str.substring(commaIndex + 1);
            }
            byte[] decodedBytes = android.util.Base64.decode(base64Str, android.util.Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
        } catch (Exception e) {
            return null;
        }
    }
}
