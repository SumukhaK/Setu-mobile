package dev.setu.mobile.core.readiness.oem

import android.app.Application
import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class OemIntentsTest {
    private val app: Application get() = ApplicationProvider.getApplicationContext()

    // P04 OEM: app details is always present, unfiltered, and last.
    @Test
    fun otherOemFallsBackToAppDetails() {
        val destinations = OemIntents(app).destinations(Oem.OTHER)

        assertEquals(listOf(Purpose.APP_DETAILS), destinations.map { it.purpose })
        val details = destinations.single()
        assertEquals("package:${app.packageName}", details.intent.dataString)
        assertFalse(details.vendorSpecific)
    }

    // P04 OEM: resolvable MIUI entries lead the list; app details stays last.
    @Test
    fun xiaomiListsResolvableVendorEntriesFirst() {
        register(XIAOMI_AUTOSTART)
        register(XIAOMI_BATTERY)

        val destinations = OemIntents(app).destinations(Oem.XIAOMI)

        assertEquals(
            listOf(Purpose.AUTOSTART, Purpose.BATTERY, Purpose.APP_DETAILS),
            destinations.map { it.purpose },
        )
        assertTrue(destinations[0].vendorSpecific)
        assertTrue(destinations[1].vendorSpecific)
        assertEquals(app.packageName, destinations[1].intent.getStringExtra("package_name"))
    }

    // P04 OEM: an unknown ROM drops the vendor table and keeps the fallback.
    @Test
    fun xiaomiWithoutRegisteredComponentsFallsBack() {
        val destinations = OemIntents(app).destinations(Oem.XIAOMI)

        assertEquals(listOf(Purpose.APP_DETAILS), destinations.map { it.purpose })
    }

    // P04 OEM: only the Samsung variant that resolves is offered.
    @Test
    fun samsungOffersOnlyTheRegisteredVariant() {
        register(SAMSUNG_BATTERY_NEW)

        val vendor = OemIntents(app).destinations(Oem.SAMSUNG).filter { it.vendorSpecific }

        assertEquals(1, vendor.size)
        assertEquals(SAMSUNG_BATTERY_NEW, vendor.single().intent.component)
    }

    // P04 OEM: resolvable system battery settings come before app details.
    @Test
    fun systemBatterySettingsComeBeforeAppDetails() {
        register(SYSTEM_BATTERY, Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)

        val destinations = OemIntents(app).destinations(Oem.OTHER)

        assertEquals(listOf(Purpose.BATTERY, Purpose.APP_DETAILS), destinations.map { it.purpose })
        assertFalse(destinations[0].vendorSpecific)
    }

    private fun register(component: ComponentName, action: String? = null) {
        val shadow = shadowOf(app.packageManager)
        shadow.addActivityIfNotPresent(component)
        if (action != null) {
            shadow.addIntentFilterForActivity(
                component,
                IntentFilter(action).apply { addCategory(Intent.CATEGORY_DEFAULT) },
            )
        }
    }

    private companion object {
        val XIAOMI_AUTOSTART = ComponentName(
            "com.miui.securitycenter",
            "com.miui.permcenter.autostart.AutoStartManagementActivity",
        )
        val XIAOMI_BATTERY = ComponentName(
            "com.miui.powerkeeper",
            "com.miui.powerkeeper.ui.HiddenAppsConfigActivity",
        )
        val SAMSUNG_BATTERY_NEW = ComponentName(
            "com.samsung.android.lool",
            "com.samsung.android.sm.ui.battery.BatteryActivity",
        )
        val SYSTEM_BATTERY = ComponentName(
            "com.android.settings",
            "com.android.settings.Settings\$BatteryOptimizationActivity",
        )
    }
}
