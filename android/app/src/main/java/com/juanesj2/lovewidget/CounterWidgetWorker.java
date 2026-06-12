package com.juanesj2.lovewidget;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.widget.RemoteViews;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingWorkPolicy;
import java.util.concurrent.TimeUnit;
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
        
        String albumName = prefs.getString("_cap_widgetAlbumName", "");
        if (albumName == null || albumName.isEmpty()) {
            albumName = prefs.getString("widgetAlbumName", "Feed General");
        }
        
        String counterText = "-- Días";
        
        try {
            if (!startDateString.isEmpty()) {
                try {
                    // Try parsing ISO 8601 string or simple string
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
                } catch (Exception e) {
                    // Fallback para fechas antiguas
                    try {
                        SimpleDateFormat sdfOld = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
                        Date startDate = sdfOld.parse(startDateString.substring(0, 10));
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
                    } catch (Exception ignored) { }
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
                
                android.content.Intent intent = new android.content.Intent(context, MainActivity.class);
                intent.putExtra("open_tab", "photo");
                android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                    context, id, intent, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );
                // Attach to the main container or root view, here widget_counter_text is always visible
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
                
                appWidgetManager.updateAppWidget(id, views);
            }
            
            // 2. Update Photo Widget
            ComponentName widgetPhoto = new ComponentName(context, CounterPhotoWidgetProvider.class);
            int[] idsPhoto = appWidgetManager.getAppWidgetIds(widgetPhoto);
            for (int id : idsPhoto) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_counter_photo);
                views.setTextViewText(R.id.widget_counter_text_large, counterText);
                views.setTextViewText(R.id.widget_album_name, albumName);
                if (photoBitmap != null) {
                    views.setImageViewBitmap(R.id.widget_photo_large, photoBitmap);
                    views.setViewVisibility(R.id.widget_photo_title, android.view.View.GONE);
                } else {
                    views.setImageViewResource(R.id.widget_photo_large, R.drawable.ic_launcher_background);
                    views.setViewVisibility(R.id.widget_photo_title, android.view.View.VISIBLE);
                    views.setTextViewText(R.id.widget_photo_title, "No hay fotos");
                }
                
                android.content.Intent intent = new android.content.Intent(context, MainActivity.class);
                intent.putExtra("open_tab", "photo");
                android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                    context, id + 1000, intent, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );
                // Attach to the left counter panel
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
                
                appWidgetManager.updateAppWidget(id, views);
            }
            
            // Program next update in 2 minutes
            OneTimeWorkRequest nextRequest = new OneTimeWorkRequest.Builder(CounterWidgetWorker.class)
                    .setInitialDelay(2, TimeUnit.MINUTES)
                    .build();
            WorkManager.getInstance(context).enqueueUniqueWork("CounterWidgetUpdate", ExistingWorkPolicy.REPLACE, nextRequest);
            
            return Result.success();
            
        } catch (Exception e) {
            e.printStackTrace();
            
            // Retry in 2 minutes if it fails too
            OneTimeWorkRequest nextRequest = new OneTimeWorkRequest.Builder(CounterWidgetWorker.class)
                    .setInitialDelay(2, TimeUnit.MINUTES)
                    .build();
            WorkManager.getInstance(context).enqueueUniqueWork("CounterWidgetUpdate", ExistingWorkPolicy.REPLACE, nextRequest);
            
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
            
            String jsonStr = content.toString();
            JSONArray photos;
            if (jsonStr.trim().startsWith("{")) {
                JSONObject obj = new JSONObject(jsonStr);
                photos = obj.optJSONArray("data") != null ? obj.optJSONArray("data") : new JSONArray();
            } else {
                photos = new JSONArray(jsonStr);
            }
            
            if (photos.length() > 0) {
                int currentIndex = prefs.getInt("counterWidgetPhotoIndex", 0);
                
                // Ensure index is within bounds (e.g. if photos were deleted)
                if (currentIndex >= photos.length()) {
                    currentIndex = 0;
                }
                
                JSONObject photo = photos.getJSONObject(currentIndex);
                
                // Save the next index to show in the carousel
                prefs.edit().putInt("counterWidgetPhotoIndex", currentIndex + 1).apply();
                
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
            
            // 1. Descargar imagen a memoria (como bytes comprimidos para no agotar la RAM)
            java.io.InputStream is = conn.getInputStream();
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[16384];
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            buffer.flush();
            byte[] imageBytes = buffer.toByteArray();
            is.close();
            
            // 2. Leer solo las dimensiones de la imagen (sin cargarla en memoria)
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, options);
            
            // Calcular factor de reducción (inSampleSize) buscando un tamaño máx de ~600px
            int reqWidth = 600;
            int reqHeight = 600;
            int inSampleSize = 1;
            
            if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
                final int halfHeight = options.outHeight / 2;
                final int halfWidth = options.outWidth / 2;
                while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                    inSampleSize *= 2;
                }
            }
            
            // 3. Decodificar la imagen real ya reducida
            options.inJustDecodeBounds = false;
            options.inSampleSize = inSampleSize;
            Bitmap decodedBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, options);
            
            // 4. Asegurarnos que no exceda el TransactionTooLargeException del Widget
            if (decodedBitmap != null) {
                int width = decodedBitmap.getWidth();
                int height = decodedBitmap.getHeight();
                int maxDim = 600;
                if (width > maxDim || height > maxDim) {
                    float ratio = Math.min((float) maxDim / width, (float) maxDim / height);
                    Bitmap scaledBitmap = Bitmap.createScaledBitmap(decodedBitmap, Math.round(width * ratio), Math.round(height * ratio), true);
                    if (scaledBitmap != decodedBitmap) {
                        decodedBitmap.recycle();
                    }
                    return scaledBitmap;
                }
            }
            return decodedBitmap;
            
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
