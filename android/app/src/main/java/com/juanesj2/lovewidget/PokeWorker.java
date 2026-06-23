package com.juanesj2.lovewidget;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.net.HttpURLConnection;
import java.net.URL;

public class PokeWorker extends Worker {

    public PokeWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("_cap_auth_token", "");
        if (token == null || token.isEmpty()) {
            token = prefs.getString("auth_token", "");
        }

        if (token.isEmpty()) {
            return Result.failure();
        }

        try {
            URL url = new URL("https://j2api.alwaysdata.net/api/love-album/poke");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");
            conn.setDoOutput(true);
            
            int responseCode = conn.getResponseCode();
            conn.disconnect();
            
            if (responseCode >= 200 && responseCode < 300) {
                return Result.success();
            } else {
                return Result.failure();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return Result.failure();
        }
    }
}
