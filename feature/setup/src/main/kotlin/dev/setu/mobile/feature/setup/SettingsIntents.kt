package dev.setu.mobile.feature.setup

import android.content.Intent
import android.provider.Settings
import dev.setu.mobile.core.readiness.Tri

fun developerOptionsIntent(enabled: Tri): Intent = Intent(
    if (enabled == Tri.YES) {
        Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS
    } else {
        Settings.ACTION_DEVICE_INFO_SETTINGS
    },
)

fun wirelessDebuggingIntent(): Intent = Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)

fun appNotificationSettingsIntent(packageName: String): Intent =
    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
