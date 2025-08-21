package com.patientengagement;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.app.Activity;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AlarmPermissionModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public AlarmPermissionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "AlarmPermissionModule"; // This is the name used to refer to the module in JavaScript
    }

    @ReactMethod
    public void checkAndRequestExactAlarmPermission(Promise promise) {
        // Check for Android version and permission status
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);

            // Check if exact alarm permission is already granted
            if (alarmManager != null && alarmManager.canScheduleExactAlarms()) {
                // Permission is granted
                promise.resolve(true);
            } else {
                // Permission not granted, request the permission
                Activity activity = getCurrentActivity();
                if (activity != null) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    activity.startActivity(intent);
                    promise.resolve(false); // Return false since permission was requested
                } else {
                    // Return error if no activity is available
                    promise.reject("NO_ACTIVITY", "No activity available to request permission.");
                }
            }
        } else {
            // For Android versions below S, permission is not needed
            promise.resolve(true);
        }
    }
}