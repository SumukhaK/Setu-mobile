package dev.setu.mobile.core.readiness

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities

fun detectSetupPath(sdkInt: Int, onWifi: Boolean, usbFallbackAllowed: Boolean): SetupPath = when {
    sdkInt >= WIRELESS_DEBUGGING_MIN_SDK && onWifi -> SetupPath.WirelessDebugging
    usbFallbackAllowed -> SetupPath.UsbTcpip
    else -> SetupPath.Unsupported(SetupPath.Reason.USB_FALLBACK_FORBIDDEN)
}

// Android 11 is the first release with Wireless debugging.
private const val WIRELESS_DEBUGGING_MIN_SDK = 30

class NetworkReader(context: Context) {
    private val manager = context.getSystemService(ConnectivityManager::class.java)

    fun onWifi(): Boolean {
        val network = manager?.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network)
        return capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    }
}
