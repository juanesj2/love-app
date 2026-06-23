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

    private static final String API_BASE = "https://j2api.alwaysdata.net/api";

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
            myUserId = prefs.getString("myUserId", "");
        }
        
        String token = readToken(context);
        
        // Fetch couple info to get partner_id, moods, and avatars
        String partnerId = "";
        String myMood = "";
        String partnerMood = "";
        String myAvatarUrl = null;
        String partnerAvatarUrl = null;
        
        if (token != null && !token.isEmpty()) {
            JSONObject info = fetchCoupleInfo(token);
            if (info != null) {
                myMood = info.optString("my_mood", "");
                partnerMood = info.optString("partner_mood", "");
                myAvatarUrl = info.optString("my_avatar", null);
                partnerAvatarUrl = info.optString("partner_avatar", null);
                partnerId = info.optString("partner_id", "");
            }
        }
        
        if (partnerId.isEmpty() || myUserId.isEmpty()) {
            return Result.failure();
        }

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
                
                double exactTileX = (centerLon + 180.0) / 360.0 * (1 << zoom);
                double exactTileY = (1 - Math.log(Math.tan(Math.toRadians(centerLat)) + 1 / Math.cos(Math.toRadians(centerLat))) / Math.PI) / 2 * (1 << zoom);
                
                int startTileX = (int) Math.floor(exactTileX - 0.5);
                int startTileY = (int) Math.floor(exactTileY - 0.5);
                
                Bitmap mapBitmap = Bitmap.createBitmap(512, 512, Bitmap.Config.ARGB_8888);
                Canvas mapCanvas = new Canvas(mapBitmap);
                boolean hasAnyTile = false;
                
                for (int dx = 0; dx <= 1; dx++) {
                    for (int dy = 0; dy <= 1; dy++) {
                        int tx = startTileX + dx;
                        int ty = startTileY + dy;
                        String tUrl = String.format(Locale.US, "https://a.basemaps.cartocdn.com/rastertiles/voyager/%d/%d/%d@2x.png", zoom, tx, ty);
                        Bitmap tBmp = fetchBitmap(tUrl);
                        if (tBmp != null) {
                            hasAnyTile = true;
                            // Where does this tile go?
                            // tile top-left in world units is tx, ty
                            float px = (float) ((tx - exactTileX) * 512.0 + 256.0);
                            float py = (float) ((ty - exactTileY) * 512.0 + 256.0);
                            mapCanvas.drawBitmap(tBmp, px, py, null);
                        }
                    }
                }
                
                if (hasAnyTile) {
                    Bitmap mutableBitmap = mapBitmap;
                    Canvas canvas = new Canvas(mutableBitmap);


                    Bitmap myAvatarBitmap = null;
                    Bitmap partnerAvatarBitmap = null;
                    
                    if (myAvatarUrl != null && !myAvatarUrl.isEmpty()) {
                        myAvatarBitmap = myAvatarUrl.startsWith("data:") ? decodeBase64Bitmap(myAvatarUrl) : fetchBitmap(myAvatarUrl);
                    }
                    if (partnerAvatarUrl != null && !partnerAvatarUrl.isEmpty()) {
                        partnerAvatarBitmap = partnerAvatarUrl.startsWith("data:") ? decodeBase64Bitmap(partnerAvatarUrl) : fetchBitmap(partnerAvatarUrl);
                    }
                
                // The avatars are drawn based on their offset from the center (which is now exactly at 256, 256)
                int mapWidth = 512;
                int mapHeight = 512;
                
                double scale = 256 * Math.pow(2, zoom) * 2; // *2 because @2x tile is 512x512
                
                int myX = 256 + (int) (lonToPixelX(myLoc.getLongitude(), scale) - lonToPixelX(centerLon, scale));
                int myY = 256 + (int) (latToPixelY(myLoc.getLatitude(), scale) - latToPixelY(centerLat, scale));
                
                int partnerX = 256 + (int) (lonToPixelX(partnerLoc.getLongitude(), scale) - lonToPixelX(centerLon, scale));
                int partnerY = 256 + (int) (latToPixelY(partnerLoc.getLatitude(), scale) - latToPixelY(centerLat, scale));

                    // Clamp to safe visible area so they NEVER go off screen or under bottom text
                    myX = Math.max(100, Math.min(mapWidth - 100, myX));
                    myY = Math.max(100, Math.min(mapHeight - 100, myY));
                    partnerX = Math.max(100, Math.min(mapWidth - 100, partnerX));
                    partnerY = Math.max(100, Math.min(mapHeight - 100, partnerY));

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

                    // Draw Distance Pill (UNDER avatars)
                    if (distance >= 50) {
                        Paint pillPaint = new Paint();
                        pillPaint.setColor(Color.WHITE);
                        pillPaint.setAntiAlias(true);
                        
                        // Add a subtle drop shadow to the pill so it stands out
                        pillPaint.setShadowLayer(6f, 0f, 2f, Color.parseColor("#40000000"));
                        
                        Paint textPaint = new Paint();
                        textPaint.setColor(Color.parseColor("#333333"));
                        textPaint.setTextSize(24f); // Smaller text for smaller avatars
                        textPaint.setFakeBoldText(true);
                        textPaint.setAntiAlias(true);
                        textPaint.setTextAlign(Paint.Align.CENTER);
                        
                        Rect textBounds = new Rect();
                        textPaint.getTextBounds(distanceText, 0, distanceText.length(), textBounds);
                        
                        int pillWidth = textBounds.width() + 40; // Less padding
                        int pillHeight = textBounds.height() + 20;
                        
                        int midX = (myX + partnerX) / 2;
                        int midY = (myY + partnerY) / 2;
                        
                        RectF pillRect = new RectF(midX - pillWidth/2f, midY - pillHeight/2f, midX + pillWidth/2f, midY + pillHeight/2f);
                        canvas.drawRoundRect(pillRect, pillHeight/2f, pillHeight/2f, pillPaint);
                        
                        canvas.drawText(distanceText, midX, midY - textBounds.exactCenterY(), textPaint);
                    } else {
                        // "Together" state: White Card
                        int midX = mapWidth / 2;
                        int midY = mapHeight / 2;
                        
                        // Draw white card
                        int cardWidth = 280;
                        int cardHeight = 240;
                        RectF cardRect = new RectF(midX - cardWidth/2f, midY - cardHeight/2f, midX + cardWidth/2f, midY + cardHeight/2f);
                        
                        Paint cardPaint = new Paint();
                        cardPaint.setColor(Color.WHITE);
                        cardPaint.setAntiAlias(true);
                        cardPaint.setShadowLayer(15f, 0f, 8f, Color.parseColor("#44000000"));
                        canvas.drawRoundRect(cardRect, 40f, 40f, cardPaint);
                        
                        // Override myX, myY, partnerX, partnerY so the avatars are drawn side by side inside the card
                        myX = midX - 25;
                        myY = midY - 30;
                        partnerX = midX + 25;
                        partnerY = midY - 30;
                        
                        // Draw text below them
                        Paint textPaint = new Paint();
                        textPaint.setColor(Color.parseColor("#D81B60")); // Deep pink like the screenshot
                        textPaint.setTextSize(36f);
                        textPaint.setFakeBoldText(true);
                        textPaint.setAntiAlias(true);
                        textPaint.setTextAlign(Paint.Align.CENTER);
                        
                        canvas.drawText("¡Estamos", midX, midY + 45, textPaint);
                        canvas.drawText("juntos! ❤️", midX, midY + 85, textPaint);
                        
                        // Add some floating hearts to simulate the animation effect the user mentioned
                        Paint heartPaint = new Paint();
                        heartPaint.setAntiAlias(true);
                        heartPaint.setTextSize(26f);
                        canvas.drawText("❤️", midX - 90, midY - 70, heartPaint);
                        canvas.drawText("💖", midX + 100, midY - 30, heartPaint);
                        canvas.drawText("✨", midX - 80, midY + 60, heartPaint);
                    }

                    // Draw Avatars (ON TOP of pill)
                    if (myAvatarBitmap != null) {
                        Bitmap circularMy = getCircularBitmapWithBorder(myAvatarBitmap, 70);
                        canvas.drawBitmap(circularMy, myX - 35, myY - 35, null);
                        drawMoodBadge(canvas, myMood, myX, myY, 35);
                    }
                    if (partnerAvatarBitmap != null) {
                        Bitmap circularPartner = getCircularBitmapWithBorder(partnerAvatarBitmap, 70);
                        canvas.drawBitmap(circularPartner, partnerX - 35, partnerY - 35, null);
                        drawMoodBadge(canvas, partnerMood, partnerX, partnerY, 35);
                    }

                    // Update Widget
                    AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                    ComponentName thisWidget = new ComponentName(context, LoveWidgetProvider.class);
                    int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

                    for (int appWidgetId : appWidgetIds) {
                        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
                        views.setImageViewBitmap(R.id.widget_map_bg, mutableBitmap);
                        views.setTextViewText(R.id.widget_time, timeText);
                        
                        android.content.Intent intent = new android.content.Intent(context, MainActivity.class);
                        intent.putExtra("open_tab", "location");
                        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                            context, 
                            appWidgetId, 
                            intent, 
                            android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(R.id.widget_map_bg, pendingIntent);
                        
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

    private void drawMoodBadge(Canvas canvas, String mood, int avatarX, int avatarY, int avatarRadius) {
        if (mood == null || mood.isEmpty()) return;
        
        int badgeX = (int)(avatarX + avatarRadius * 0.7); 
        int badgeY = (int)(avatarY - avatarRadius * 0.7);
        
        Paint circlePaint = new Paint();
        circlePaint.setColor(Color.WHITE);
        circlePaint.setAntiAlias(true);
        
        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.parseColor("#FF4D6D"));
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(4f);
        borderPaint.setAntiAlias(true);
        
        canvas.drawCircle(badgeX, badgeY, 20f, circlePaint);
        canvas.drawCircle(badgeX, badgeY, 20f, borderPaint);
        
        Paint emojiPaint = new Paint();
        emojiPaint.setTextSize(26f);
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
        canvas.drawCircle(size / 2f, size / 2f, size / 2f - 6f, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rectF, paint);
        
        // draw border
        paint.setXfermode(null);
        paint.setStyle(Paint.Style.STROKE);
        paint.setColor(Color.WHITE);
        paint.setStrokeWidth(6f);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f - 3f, paint);
        
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
    
    private int calculateZoom(float distanceMeters) {
        if (distanceMeters < 1000) return 15;
        if (distanceMeters < 2500) return 14;
        if (distanceMeters < 5000) return 13;
        if (distanceMeters < 10000) return 12;
        if (distanceMeters < 25000) return 11;
        if (distanceMeters < 50000) return 10;
        if (distanceMeters < 100000) return 9;
        if (distanceMeters < 200000) return 8;
        if (distanceMeters < 400000) return 7;
        if (distanceMeters < 800000) return 6;
        if (distanceMeters < 1600000) return 5;
        if (distanceMeters < 3200000) return 4;
        return 3;
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
