package com.patientengagement;
import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.annotation.RequiresApi;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMethod;
import java.util.List;
public class AppForegrounderModule extends ReactContextBaseJavaModule {

    private static ReactApplicationContext reactContext;

    AppForegrounderModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "AppForegrounder";
    }

    @ReactMethod
    public void bringToForeground() {
        try {
            ActivityManager activityManager = (ActivityManager) getReactApplicationContext().getSystemService(Context.ACTIVITY_SERVICE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Check for background state in newer Android versions
                List<ActivityManager.RunningAppProcessInfo> processInfoList = activityManager.getRunningAppProcesses();
                for (ActivityManager.RunningAppProcessInfo processInfo : processInfoList) {
                    if (processInfo.processName.equals(getReactApplicationContext().getPackageName()) &&
                            processInfo.importance != ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                        Intent intent = new Intent(getReactApplicationContext(), getReactApplicationContext().getClass());
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                        getReactApplicationContext().startActivity(intent);
                    }
                }
            } else {
                // For older Android versions
                List<ActivityManager.RunningTaskInfo> taskInfoList = activityManager.getRunningTasks(1);
                if (!taskInfoList.isEmpty()) {
                    ActivityManager.RunningTaskInfo taskInfo = taskInfoList.get(0);
                    if (taskInfo.topActivity.getPackageName().equals(getReactApplicationContext().getPackageName())) {
                        Intent intent = new Intent(getReactApplicationContext(), taskInfo.topActivity.getClass());
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                        getReactApplicationContext().startActivity(intent);
                    } else {
                        Log.d("AppForegrounder", "No task found for the application.");
                    }
                }
            }
        } catch (Exception e) {
            Log.d("AppForegrounder", "Error bringing app to foreground: " + e.getMessage());
        }
    }
}
