package dev.setu.mobile.service

import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.core.content.ContextCompat
import dev.genadb.sdk.GenAdbException
import dev.genadb.sdk.SetuConfig
import dev.genadb.sdk.SetuManager
import dev.genadb.sdk.SetuNotifications
import dev.setu.mobile.core.setu.SetuHost
import dev.setu.mobile.core.setu.SetuManagerHost
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

/**
 * Owns the agent's lifecycle (AD-1): it is the only place that starts or stops
 * the SDK, and it keeps a lock-screen-safe notification in sync (AD-2).
 */
open class HostingService : Service() {
    private val scope = MainScope()
    private lateinit var host: SetuHost

    private val restrictionsReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            host.refreshPolicy()
            startHost(relayUrl = null)
        }
    }

    /** The only [SetuManager.initialize] call in the app; tests override this. */
    protected open fun createHost(): SetuHost =
        SetuManagerHost(SetuManager.initialize(SetuManager.Builder(this)))

    override fun onCreate() {
        super.onCreate()
        host = createHost()
        HostingRegistry.attach(host)
        HostingNotification.ensureChannel(this)
        ContextCompat.registerReceiver(
            this,
            restrictionsReceiver,
            IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        scope.launch {
            combine(host.connectionState, host.sessions, SetuNotifications::content).collect { content ->
                notificationManager().notify(
                    HostingNotification.NOTIFICATION_ID,
                    HostingNotification.build(this@HostingService, content),
                )
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(
            HostingNotification.NOTIFICATION_ID,
            HostingNotification.build(
                this,
                SetuNotifications.content(host.connectionState.value, host.sessions.value),
            ),
            // The manifest declares specialUse; the sentinel keeps minSdk 29 happy.
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST,
        )
        startHost(intent?.getStringExtra(EXTRA_RELAY_URL))
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        host.stop()
        HostingRegistry.detach(host)
        unregisterReceiver(restrictionsReceiver)
        scope.cancel()
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startHost(relayUrl: String?) {
        try {
            if (relayUrl != null) {
                host.start(SetuConfig(relayUrl = relayUrl))
            } else {
                host.start()
            }
        } catch (ignored: GenAdbException.NotConfigured) {
            // No relay URL is known yet; settings storage arrives in AT-10.
            stopSelf()
        }
    }

    private fun notificationManager(): NotificationManager =
        getSystemService(NotificationManager::class.java)

    companion object {
        const val EXTRA_RELAY_URL = "dev.setu.mobile.extra.RELAY_URL"

        fun start(context: Context, relayUrl: String) {
            val intent = Intent(context, HostingService::class.java)
                .putExtra(EXTRA_RELAY_URL, relayUrl)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, HostingService::class.java)
            context.stopService(intent)
        }
    }
}
