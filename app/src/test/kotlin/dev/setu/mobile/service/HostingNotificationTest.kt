package dev.setu.mobile.service

import android.app.Notification
import android.content.Context
import android.os.Bundle
import androidx.test.core.app.ApplicationProvider
import dev.genadb.sdk.ConnectionState
import dev.genadb.sdk.SetuNotifications
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class HostingNotificationTest {
    private val context: Context get() = ApplicationProvider.getApplicationContext()

    // P06: the pairing code never appears in either notification variant.
    @Test
    fun p06PairingCodeIsAbsentFromBothVariants() {
        val content = SetuNotifications.content(
            ConnectionState.Online(deviceId = "dev-1", pairingCode = "4321-908172"),
            emptyList(),
        )
        val notification = HostingNotification.build(context, content)

        assertEquals(Notification.VISIBILITY_SECRET, notification.visibility)
        assertEquals(content.publicText, text(notification))
        assertEquals(content.title, title(notification))
        val public = requireNotNull(notification.publicVersion)
        assertEquals(content.publicText, text(public))

        val strings = charSequences(notification)
        assertFalse(strings.any { it.contains("4321-908172") })
        assertFalse(strings.any { it.contains("4321908172") })
    }

    // P06: every state renders publicText in both variants, never text.
    @Test
    fun p06EveryStateUsesPublicText() {
        val states = listOf(
            ConnectionState.Idle,
            ConnectionState.Starting,
            ConnectionState.Reconnecting(attempt = 1, reason = "agent exited", retryInMs = 1_000),
            ConnectionState.Blocked("debugging_disallowed"),
            ConnectionState.PolicyMissing("policy_json"),
        )
        for (state in states) {
            val content = SetuNotifications.content(state, emptyList())
            val notification = HostingNotification.build(context, content)

            assertEquals(state.toString(), Notification.VISIBILITY_SECRET, notification.visibility)
            assertEquals(state.toString(), content.publicText, text(notification))
            assertEquals(state.toString(), content.publicText, text(requireNotNull(notification.publicVersion)))
        }
    }

    private fun text(notification: Notification): String? =
        notification.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()

    private fun title(notification: Notification): String? =
        notification.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()

    /** Every CharSequence in both variants' extras and ticker text. */
    private fun charSequences(notification: Notification): List<String> {
        val found = mutableListOf<String>()
        fun scan(value: Any?) {
            when (value) {
                is CharSequence -> found += value.toString()
                is Bundle -> value.keySet().forEach { scan(value.get(it)) }
                is Array<*> -> value.forEach { scan(it) }
            }
        }
        scan(notification.extras)
        scan(notification.tickerText)
        notification.publicVersion?.let { public ->
            scan(public.extras)
            scan(public.tickerText)
        }
        return found
    }
}
