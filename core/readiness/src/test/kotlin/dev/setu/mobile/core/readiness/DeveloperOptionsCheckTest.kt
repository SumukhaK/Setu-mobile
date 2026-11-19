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
class DeveloperOptionsCheckTest {
    private val context: Context get() = ApplicationProvider.getApplicationContext()
    private val key = Settings.Global.DEVELOPMENT_SETTINGS_ENABLED

    // P04: the global setting is the platform signal for Developer options.
    @Test
    fun enabledWhenSettingIsOne() {
        Settings.Global.putInt(context.contentResolver, key, 1)

        assertEquals(Tri.YES, DeveloperOptionsCheck(context).enabled())
    }

    @Test
    fun disabledWhenSettingIsZero() {
        Settings.Global.putInt(context.contentResolver, key, 0)

        assertEquals(Tri.NO, DeveloperOptionsCheck(context).enabled())
    }

    // P04: a missing setting counts as disabled, never as an exception.
    @Test
    fun disabledWhenSettingIsMissing() {
        Settings.Global.putString(context.contentResolver, key, null)

        assertEquals(Tri.NO, DeveloperOptionsCheck(context).enabled())
    }
}
