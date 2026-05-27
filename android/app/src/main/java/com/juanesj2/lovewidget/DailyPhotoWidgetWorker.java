package com.juanesj2.lovewidget;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.widget.RemoteViews;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import org.json.JSONArray;
import org.json.JSONObject;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Matrix;
import android.util.Log;

public class DailyPhotoWidgetWorker extends Worker {

    private static final String TAG = "DailyPhotoWidget";
    private static final String API_BASE = "https://enfoca.alwaysdata.net/api";
    private static final String STORAGE_BASE = "https://enfoca.alwaysdata.net/storage/";

    public DailyPhotoWidgetWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        String token = readToken(context);

        if (token == null || token.isEmpty()) {
            return Result.retry();
        }

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String myUsername = prefs.getString("_cap_myUserId", "");
        if (myUsername == null || myUsername.isEmpty()) {
            myUsername = prefs.getString("myUserId", "");
        }
        final String cleanUsername = myUsername != null ? myUsername.trim().toLowerCase() : "";

        try {
            int myUserId = fetchMyUserId(token);
            JSONArray photos = fetchPhotos(token);
            
            int streak = fetchCurrentStreak(token);

            if (photos != null && photos.length() > 0) {
                String partnerPhotoPath = null;
                String uploaderName = "";
                String uploaderEmail = "";
                int uploaderId = -1;
                
                for (int i = 0; i < photos.length(); i++) {
                    JSONObject photo = photos.getJSONObject(i);
                    int photoUserId = photo.optInt("user_id", -1);
                    
                    boolean isMyPhoto = false;
                    if (myUserId > 0 && photoUserId == myUserId) {
                        isMyPhoto = true;
                    }
                    
                    JSONObject userObj = photo.optJSONObject("user");
                    if (userObj != null) {
                        String email = userObj.optString("email", "").toLowerCase();
                        if (!cleanUsername.isEmpty() && email.startsWith(cleanUsername)) {
                            isMyPhoto = true;
                        }
                    }

                    if (!isMyPhoto) {
                        partnerPhotoPath = photo.getString("image_path");
                        if (userObj != null) {
                            uploaderName = userObj.optString("name", "");
                            uploaderEmail = userObj.optString("email", "");
                        }
                        uploaderId = photoUserId;
                        break;
                    }
                }

                if (partnerPhotoPath == null && photos.length() > 0) {
                    partnerPhotoPath = photos.getJSONObject(0).getString("image_path");
                    JSONObject userObj = photos.getJSONObject(0).optJSONObject("user");
                    if (userObj != null) {
                        uploaderName = userObj.optString("name", "");
                        uploaderEmail = userObj.optString("email", "");
                    }
                    uploaderId = photos.getJSONObject(0).optInt("user_id", -1);
                }
                
                if (uploaderName.isEmpty()) {
                    uploaderName = uploaderEmail.split("@")[0];
                }
                
                // Fetch Partner Avatar from Firestore
                String partnerIdForFirestore = "roberta";
                if (cleanUsername.equals("roberta")) partnerIdForFirestore = "juan";
                else if (uploaderEmail.startsWith("juan")) partnerIdForFirestore = "juan";
                else if (uploaderEmail.startsWith("roberta")) partnerIdForFirestore = "roberta";
                
                Bitmap avatarBitmap = null;
                String avatarUrl = fetchAvatar(partnerIdForFirestore);
                if (avatarUrl != null && !avatarUrl.isEmpty()) {
                    avatarBitmap = avatarUrl.startsWith("data:") ? decodeBase64Bitmap(avatarUrl) : fetchBitmap(avatarUrl, null);
                }

                if (partnerPhotoPath != null) {
                    String imageUrl = STORAGE_BASE + partnerPhotoPath;
                    Bitmap photoBitmap = fetchBitmap(imageUrl, token);

                    if (photoBitmap != null) {
                        Bitmap compositedBitmap = createCompositedWidgetBitmap(photoBitmap, streak, avatarBitmap, uploaderName);

                        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                        ComponentName thisWidget = new ComponentName(context, DailyPhotoWidgetProvider.class);
                        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

                        for (int appWidgetId : appWidgetIds) {
                            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_daily_photo);
                            views.setImageViewBitmap(R.id.widget_daily_photo, compositedBitmap);
                            appWidgetManager.updateAppWidget(appWidgetId, views);
                        }
                        return Result.success();
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating widget", e);
        }

        return Result.retry();
    }
    
    private Bitmap createCompositedWidgetBitmap(Bitmap photo, int streak, Bitmap avatar, String name) {
        int width = 600;
        int height = 600;
        Bitmap output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        
        // Draw photo center cropped
        float scale;
        float dx = 0, dy = 0;
        if (photo.getWidth() * height > width * photo.getHeight()) {
            scale = (float) height / (float) photo.getHeight();
            dx = (width - photo.getWidth() * scale) * 0.5f;
        } else {
            scale = (float) width / (float) photo.getWidth();
            dy = (height - photo.getHeight() * scale) * 0.5f;
        }
        
        Matrix matrix = new Matrix();
        matrix.setScale(scale, scale);
        matrix.postTranslate(dx, dy);
        canvas.drawBitmap(photo, matrix, new Paint(Paint.FILTER_BITMAP_FLAG));
        
        // Draw Badges
        drawStreakBadge(canvas, streak);
        drawAvatarBadge(canvas, avatar, name, height);
        
        return output;
    }
    
    private void drawStreakBadge(Canvas canvas, int streak) {
        if (streak <= 0) return;
        
        Paint bgPaint = new Paint();
        bgPaint.setColor(Color.parseColor("#80000000"));
        bgPaint.setAntiAlias(true);
        
        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.parseColor("#44FFFFFF"));
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(3f);
        borderPaint.setAntiAlias(true);

        String text = "🔥 " + streak;
        
        Paint textPaint = new Paint();
        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(40f);
        textPaint.setFakeBoldText(true);
        textPaint.setAntiAlias(true);
        
        Rect textBounds = new Rect();
        textPaint.getTextBounds(text, 0, text.length(), textBounds);
        
        int paddingX = 25;
        int paddingY = 15;
        int width = textBounds.width() + paddingX * 2;
        int height = textBounds.height() + paddingY * 2;
        
        int x = 30; // margin left
        int y = 30; // margin top
        
        RectF rect = new RectF(x, y, x + width, y + height);
        canvas.drawRoundRect(rect, 40f, 40f, bgPaint);
        canvas.drawRoundRect(rect, 40f, 40f, borderPaint);
        
        canvas.drawText(text, x + paddingX, y + height - paddingY - 5, textPaint);
    }

    private void drawAvatarBadge(Canvas canvas, Bitmap avatarBitmap, String name, int canvasHeight) {
        int radius = 55;
        int x = 30 + radius;
        int y = canvasHeight - 30 - radius;
        
        Paint bgPaint = new Paint();
        bgPaint.setColor(Color.parseColor("#80000000"));
        bgPaint.setAntiAlias(true);
        
        Paint borderPaint = new Paint();
        borderPaint.setColor(Color.parseColor("#44FFFFFF"));
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(4f);
        borderPaint.setAntiAlias(true);
        
        canvas.drawCircle(x, y, radius, bgPaint);
        
        if (avatarBitmap != null) {
            Bitmap circular = getCircularBitmap(avatarBitmap, radius * 2);
            canvas.drawBitmap(circular, x - radius, y - radius, null);
        } else {
            String initial = name != null && name.length() > 0 ? name.substring(0, 1).toUpperCase() : "?";
            if (name != null && name.contains(" ")) {
                String[] parts = name.split(" ");
                if (parts.length > 1 && parts[1].length() > 0) {
                    initial += parts[1].substring(0, 1).toUpperCase();
                }
            } else if (name != null && name.length() > 1) {
                 initial = name.substring(0, 2).toUpperCase();
            }
            
            Paint textPaint = new Paint();
            textPaint.setColor(Color.WHITE);
            textPaint.setTextSize(46f);
            textPaint.setFakeBoldText(true);
            textPaint.setAntiAlias(true);
            textPaint.setTextAlign(Paint.Align.CENTER);
            
            Rect textBounds = new Rect();
            textPaint.getTextBounds(initial, 0, initial.length(), textBounds);
            
            canvas.drawText(initial, x, y - textBounds.exactCenterY(), textPaint);
        }
        
        canvas.drawCircle(x, y, radius, borderPaint);
    }
    
    private Bitmap getCircularBitmap(Bitmap bitmap, int size) {
        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        final Paint paint = new Paint();
        final Rect rect = new Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());
        final RectF rectF = new RectF(0, 0, size, size);
        paint.setAntiAlias(true);
        canvas.drawARGB(0, 0, 0, 0);
        paint.setColor(Color.WHITE);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rectF, paint);
        return output;
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
    
    private int fetchCurrentStreak(String token) {
        try {
            URL url = new URL(API_BASE + "/love-album/info");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");
            
            if (conn.getResponseCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) content.append(line);
                in.close();
                JSONObject json = new JSONObject(content.toString());
                return json.optInt("current_streak", 0);
            }
            conn.disconnect();
        } catch (Exception e) {}
        return 0;
    }

    private int fetchMyUserId(String token) {
        try {
            URL url = new URL(API_BASE + "/usuario");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");

            if (conn.getResponseCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) content.append(line);
                in.close();

                JSONObject json = new JSONObject(content.toString());
                int userId = json.optInt("id", -1);
                if (userId == -1 && json.has("data")) {
                    JSONObject data = json.getJSONObject("data");
                    userId = data.optInt("id", -1);
                }
                return userId;
            }
            conn.disconnect();
        } catch (Exception e) {}
        return -1;
    }

    private JSONArray fetchPhotos(String token) {
        try {
            URL url = new URL(API_BASE + "/love-album/photos");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");

            if (conn.getResponseCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) content.append(line);
                in.close();
                return new JSONArray(content.toString());
            }
            conn.disconnect();
        } catch (Exception e) {}
        return null;
    }
    
    private String fetchAvatar(String userId) {
        try {
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
            JSONObject fields = json.optJSONObject("fields");
            if (fields != null && fields.has("avatar")) {
                return fields.getJSONObject("avatar").optString("stringValue", "");
            }
        } catch (Exception e) {}
        return null;
    }

    private Bitmap fetchBitmap(String urlString, String token) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }
            conn.setDoInput(true);
            conn.connect();
            if (conn.getResponseCode() == 200) {
                return BitmapFactory.decodeStream(conn.getInputStream());
            }
        } catch (Exception e) {}
        return null;
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
