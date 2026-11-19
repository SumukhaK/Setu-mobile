package dev.setu.mobile.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import dev.genadb.sdk.NotificationContent
import dev.setu.mobile.R

/**
 * Builds the hosting notification (P06, AD-2). It has no state and never calls
 * the SDK: only [NotificationContent.publicText] reaches either variant, so a
 * pairing code cannot appear on the lock screen.
 */
object HostingNotification {
    const val NOTIFICATION_ID = 1
    const val CHANNEL_ID = "hosting"

    fun build(context: Context, content: NotificationContent): Notification {
        val publicVersion = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setContentTitle(content.title)
            .setContentText(content.publicText)
            .build()

        return Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setContentTitle(content.title)
            .setContentText(content.publicText)
            .setVisibility(Notification.VISIBILITY_SECRET)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPublicVersion(publicVersion)
            .build()
    }

    fun ensureChannel(context: Context) {
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.hosting_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        )
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}
