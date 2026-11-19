package dev.setu.mobile.core.readiness

import android.content.Context
import android.provider.Settings
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class WirelessDebuggingCheckTest {
    private val context: Context get() = ApplicationProvider.getApplicationContext()
    private val key = "adb_wifi_enabled"

    // P04/J2: best-effort read of the hidden Wireless debugging toggle.
    @Test
    fun enabledWhenTheKeyIsOne() {
        Settings.Global.putInt(context.contentResolver, key, 1)

        assertEquals(Tri.YES, WirelessDebuggingCheck(context).enabled())
    }

    @Test
    fun disabledWhenTheKeyIsZero() {
        Settings.Global.putInt(context.contentResolver, key, 0)

        assertEquals(Tri.NO, WirelessDebuggingCheck(context).enabled())
    }

    // P04: the key is not present on every build; absence is unknown, not an error.
    @Test
    fun unknownWhenTheKeyIsMissing() {
        Settings.Global.putString(context.contentResolver, key, null)

        assertEquals(Tri.UNKNOWN, WirelessDebuggingCheck(context).enabled())
    }

    // P04: Wireless debugging only exists from Android 11.
    @Config(sdk = [29])
    @Test
    fun unknownBeforeAndroidEleven() {
        Settings.Global.putInt(context.contentResolver, key, 1)

        assertEquals(Tri.UNKNOWN, WirelessDebuggingCheck(context).enabled())
    }
}
