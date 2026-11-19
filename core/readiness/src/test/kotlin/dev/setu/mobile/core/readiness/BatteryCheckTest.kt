package dev.setu.mobile.core.readiness

import android.app.Application
import android.os.PowerManager
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class BatteryCheckTest {
    private val app: Application get() = ApplicationProvider.getApplicationContext()

    // P04 battery: the allowlist is the platform signal, with no permission needed.
    @Test
    fun yesWhenTheAppIsIgnoringOptimizations() {
        powerManager().let { shadowOf(it).setIgnoringBatteryOptimizations(app.packageName, true) }

        assertEquals(Tri.YES, BatteryCheck(app).ignoringOptimizations())
    }

    @Test
    fun noWhenTheAppIsOptimized() {
        powerManager().let { shadowOf(it).setIgnoringBatteryOptimizations(app.packageName, false) }

        assertEquals(Tri.NO, BatteryCheck(app).ignoringOptimizations())
    }

    private fun powerManager(): PowerManager = requireNotNull(app.getSystemService(PowerManager::class.java))
}
