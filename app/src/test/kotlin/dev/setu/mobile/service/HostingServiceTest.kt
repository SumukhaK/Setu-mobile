package dev.setu.mobile.service

import android.Manifest
import android.app.Application
import android.app.Notification
import android.app.NotificationManager
import android.content.Intent
import android.os.Looper
import androidx.test.core.app.ApplicationProvider
import dev.genadb.sdk.ConnectionState
import dev.genadb.sdk.DeviceSession
import dev.genadb.sdk.GenAdbException
import dev.genadb.sdk.SetuNotifications
import dev.setu.mobile.core.setu.SetuHost
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ServiceController
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class HostingServiceTest {
    private val app: Application get() = ApplicationProvider.getApplicationContext()
    private lateinit var fake: FakeSetuHost
    private lateinit var controller: ServiceController<TestHostingService>

    @Before
    fun setUp() {
        fake = FakeSetuHost()
        TestHostingService.host = fake
    }

    private fun intent(relayUrl: String? = null): Intent =
        Intent(app, TestHostingService::class.java).apply {
            if (relayUrl != null) putExtra(HostingService.EXTRA_RELAY_URL, relayUrl)
        }

    private fun create(relayUrl: String? = null): TestHostingService {
        controller = Robolectric.buildService(TestHostingService::class.java, intent(relayUrl)).create()
        idle()
        return controller.get()
    }

    private fun start(relayUrl: String? = null): TestHostingService {
        val service = create(relayUrl)
        controller.startCommand(0, 1)
        idle()
        return service
    }

    private fun idle() = shadowOf(Looper.getMainLooper()).idle()

    // AT-02 start: the relay URL from the intent is handed to the host once, in the foreground.
    @Test
    fun startWithRelayUrlStartsHostOnceInForeground() {
        val service = start("wss://relay.test/")
        val shadow = shadowOf(service)

        assertEquals(HostingNotification.NOTIFICATION_ID, shadow.lastForegroundNotificationId)
        assertTrue(shadow.isLastForegroundNotificationAttached)
        assertEquals(listOf("wss://relay.test/"), fake.starts.map { it?.relayUrl })
        assertEquals(1, fake.starts.size)
    }

    // AT-02 start: without the extra the SDK reuses the last config, so start(null) is correct.
    @Test
    fun startWithoutExtraReusesLastConfig() {
        start()

        assertEquals(listOf<String?>(null), fake.starts)
    }

    // P06: the posted notification always carries the redacted text for the current state.
    @Test
    fun p06NotificationTextFollowsState() {
        start("wss://relay.test/")
        fake.connectionState.value = ConnectionState.Online(
            deviceId = "dev-1",
            pairingCode = "4321-908172",
        )
        fake.sessions.value = listOf(DeviceSession(id = "a1", peerLabel = "ci-laptop", transport = "relay-wss"))
        idle()

        val manager = app.getSystemService(NotificationManager::class.java)
        val posted = requireNotNull(shadowOf(manager).getNotification(HostingNotification.NOTIFICATION_ID))
        val expected = SetuNotifications.content(fake.connectionState.value, fake.sessions.value)
        val postedText = posted.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()

        assertEquals(expected.publicText, postedText)
        assertFalse(postedText?.contains("4321-908172") ?: false)
    }

    // P06 (EMM): a restrictions change refreshes policy, then restarts with the stored config.
    @Test
    fun restrictionsChangedRefreshesPolicyThenStarts() {
        create()
        fake.calls.clear()

        app.sendBroadcast(Intent(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED))
        idle()

        assertEquals(listOf("refreshPolicy", "start"), fake.calls)
        assertEquals(listOf<String?>(null), fake.starts)
    }

    // AT-02 error path: NotConfigured (no relay yet) stops the service instead of crashing.
    @Test
    fun notConfiguredStopsServiceWithoutThrowing() {
        fake.startError = GenAdbException.NotConfigured()

        val service = start("wss://relay.test/")

        assertEquals(1, fake.starts.size)
        assertTrue(shadowOf(service).isStoppedBySelf)
    }

    // P06: notifications are posted even when POST_NOTIFICATIONS is denied.
    @Config(sdk = [33])
    @Test
    fun p06StartsHostWhenNotificationPermissionIsDenied() {
        shadowOf(app).denyPermissions(Manifest.permission.POST_NOTIFICATIONS)

        start("wss://relay.test/")

        assertEquals(listOf("wss://relay.test/"), fake.starts.map { it?.relayUrl })
        assertEquals(1, fake.starts.size)
    }

    // P17 stop hosting: destroy stops the agent, drops the notification and unregisters the receiver.
    @Test
    fun p17DestroyStopsHostRemovesNotificationAndUnregistersReceiver() {
        val service = start("wss://relay.test/")

        controller.destroy()

        assertEquals(1, fake.stopCount)
        val shadow = shadowOf(service)
        assertTrue(shadow.isForegroundStopped)
        assertTrue(shadow.notificationShouldRemoved)

        fake.calls.clear()
        app.sendBroadcast(Intent(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED))
        idle()
        assertFalse(fake.calls.contains("refreshPolicy"))
    }
}

/** Test double for the one line the service is allowed to own (DIP seam). */
private class TestHostingService : HostingService() {
    override fun createHost(): SetuHost = host

    companion object {
        lateinit var host: SetuHost
    }
}
