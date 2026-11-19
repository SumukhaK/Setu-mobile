package dev.setu.mobile.core.readiness.oem

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings

enum class Purpose { AUTOSTART, BATTERY, APP_DETAILS }

data class SettingsDestination(
    val purpose: Purpose,
    val intent: Intent,
    val vendorSpecific: Boolean,
)

class OemIntents(private val context: Context) {
    fun destinations(oem: Oem): List<SettingsDestination> {
        val vendor = vendorDestinations(oem).filter { it.resolves() }
        val systemBattery = SettingsDestination(
            purpose = Purpose.BATTERY,
            intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
            vendorSpecific = false,
        ).takeIf { it.resolves() }
        return vendor + listOfNotNull(systemBattery) + appDetails()
    }

    private fun vendorDestinations(oem: Oem): List<SettingsDestination> = when (oem) {
        Oem.XIAOMI -> listOf(
            vendor(
                Purpose.AUTOSTART,
                "com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartManagementActivity",
            ),
            vendor(
                Purpose.BATTERY,
                "com.miui.powerkeeper",
                "com.miui.powerkeeper.ui.HiddenAppsConfigActivity",
            ) {
                putExtra("package_name", context.packageName)
                putExtra("package_label", appLabel())
            },
        )
        Oem.SAMSUNG -> listOf(
            vendor(
                Purpose.BATTERY,
                "com.samsung.android.lool",
                "com.samsung.android.sm.battery.ui.BatteryActivity",
            ),
            vendor(
                Purpose.BATTERY,
                "com.samsung.android.lool",
                "com.samsung.android.sm.ui.battery.BatteryActivity",
            ),
        )
        Oem.COLOROS -> listOf(
            vendor(
                Purpose.AUTOSTART,
                "com.coloros.safecenter",
                "com.coloros.safecenter.permission.startup.StartupAppListActivity",
            ),
            vendor(
                Purpose.AUTOSTART,
                "com.coloros.safecenter",
                "com.coloros.safecenter.startupapp.StartupAppListActivity",
            ),
            vendor(
                Purpose.AUTOSTART,
                "com.oppo.safe",
                "com.oppo.safe.permission.startup.StartupAppListActivity",
            ),
        )
        Oem.OTHER -> emptyList()
    }

    private fun vendor(
        purpose: Purpose,
        packageName: String,
        className: String,
        configure: Intent.() -> Unit = {},
    ): SettingsDestination {
        val intent = Intent()
            .setComponent(ComponentName(packageName, className))
            .apply(configure)
        return SettingsDestination(purpose, intent, vendorSpecific = true)
    }

    private fun appDetails(): SettingsDestination = SettingsDestination(
        purpose = Purpose.APP_DETAILS,
        intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.fromParts("package", context.packageName, null)),
        vendorSpecific = false,
    )

    private fun appLabel(): String = context.applicationInfo.loadLabel(context.packageManager).toString()

    private fun SettingsDestination.resolves(): Boolean =
        context.packageManager
            .queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            .isNotEmpty()
}
