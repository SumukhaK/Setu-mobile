package dev.setu.mobile.feature.setup

import android.content.Context
import android.os.Build
import dev.setu.mobile.core.readiness.BatteryCheck
import dev.setu.mobile.core.readiness.DeviceChecks
import dev.setu.mobile.core.readiness.DeveloperOptionsCheck
import dev.setu.mobile.core.readiness.NetworkReader
import dev.setu.mobile.core.readiness.NotificationCheck
import dev.setu.mobile.core.readiness.WirelessDebuggingCheck
import dev.setu.mobile.core.readiness.oem.Oem
import dev.setu.mobile.core.readiness.oem.oemOf

data class DeviceSnapshot(
    val sdkInt: Int,
    val onWifi: Boolean,
    val checks: DeviceChecks,
    val oem: Oem,
)

fun interface DeviceProbe {
    fun read(): DeviceSnapshot
}

class AndroidDeviceProbe(private val context: Context) : DeviceProbe {
    override fun read(): DeviceSnapshot = DeviceSnapshot(
        sdkInt = Build.VERSION.SDK_INT,
        onWifi = NetworkReader(context).onWifi(),
        checks = DeviceChecks(
            developerOptions = DeveloperOptionsCheck(context).enabled(),
            wirelessDebugging = WirelessDebuggingCheck(context).enabled(),
            notifications = NotificationCheck(context).granted(),
            battery = BatteryCheck(context).ignoringOptimizations(),
        ),
        oem = oemOf(Build.MANUFACTURER, Build.BRAND),
    )
}
