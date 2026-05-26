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

        // Capacitor Preferences stores keys with "_cap_" prefix in "CAPStorage"
        // Also try legacy "CapacitorStorage" without prefix as fallback
        String token = readToken(context);

        if (token == null || token.isEmpty()) {
            Log.w(TAG, "No auth token found, retrying later");
            return Result.retry();
        }

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String myUsername = prefs.getString("_cap_myUserId", "");
        if (myUsername == null || myUsername.isEmpty()) {
            myUsername = prefs.getString("myUserId", "");
        }
        if (myUsername == null) myUsername = "";
        final String cleanUsername = myUsername.trim().toLowerCase();

        try {
            // 1. Get current user ID to know who the partner is
            int myUserId = fetchMyUserId(token);

            // 2. Get the couple's photos
            JSONArray photos = fetchPhotos(token);

            if (photos != null && photos.length() > 0) {
                // 3. Find the latest photo NOT uploaded by the current user (partner's photo)
                String partnerPhotoPath = null;
                for (int i = 0; i < photos.length(); i++) {
                    JSONObject photo = photos.getJSONObject(i);
                    int photoUserId = photo.optInt("user_id", -1);
                    
                    boolean isMyPhoto = false;
                    if (myUserId > 0 && photoUserId == myUserId) {
                        isMyPhoto = true;
                    }
                    
                    // Fallback comparison using username prefix on the user's email
                    if (!isMyPhoto && !cleanUsername.isEmpty()) {
                        JSONObject userObj = photo.optJSONObject("user");
                        if (userObj != null) {
                            String email = userObj.optString("email", "").toLowerCase();
                            if (email.startsWith(cleanUsername)) {
                                isMyPhoto = true;
                            }
                        }
                    }

                    if (!isMyPhoto) {
                        partnerPhotoPath = photo.getString("image_path");
                        break;
                    }
                }

                // Fallback: show the latest photo if no partner photo found
                if (partnerPhotoPath == null && photos.length() > 0) {
                    partnerPhotoPath = photos.getJSONObject(0).getString("image_path");
                }

                if (partnerPhotoPath != null) {
                    String imageUrl = STORAGE_BASE + partnerPhotoPath;
                    Log.d(TAG, "Loading partner photo: " + imageUrl);
                    Bitmap photoBitmap = fetchBitmap(imageUrl, token);

                    if (photoBitmap != null) {
                        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                        ComponentName thisWidget = new ComponentName(context, DailyPhotoWidgetProvider.class);
                        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

                        for (int appWidgetId : appWidgetIds) {
                            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_daily_photo);
                            views.setImageViewBitmap(R.id.widget_daily_photo, photoBitmap);
                            views.setTextViewText(R.id.widget_daily_title, "");
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

    private int fetchMyUserId(String token) {
        try {
            URL url = new URL(API_BASE + "/usuario");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            if (conn.getResponseCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) content.append(line);
                in.close();
                conn.disconnect();

                JSONObject json = new JSONObject(content.toString());
                int userId = json.optInt("id", -1);
                if (userId == -1 && json.has("data")) {
                    JSONObject data = json.getJSONObject("data");
                    userId = data.optInt("id", -1);
                }
                return userId;
            }
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Could not fetch user ID", e);
        }
        return -1;
    }

    private JSONArray fetchPhotos(String token) {
        try {
            URL url = new URL(API_BASE + "/love-album/photos");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) content.append(line);
                in.close();
                conn.disconnect();
                return new JSONArray(content.toString());
            }
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Could not fetch photos", e);
        }
        return null;
    }

    private Bitmap fetchBitmap(String urlString, String token) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setDoInput(true);
            conn.connect();
            if (conn.getResponseCode() == 200) {
                return BitmapFactory.decodeStream(conn.getInputStream());
            }
        } catch (Exception e) {
            Log.e(TAG, "Could not fetch bitmap: " + urlString, e);
        }
        return null;
    }
}
