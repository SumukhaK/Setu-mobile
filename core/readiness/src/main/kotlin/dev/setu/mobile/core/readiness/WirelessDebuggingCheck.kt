package dev.setu.mobile.core.readiness

import android.content.Context
import android.os.Build
import android.provider.Settings

class WirelessDebuggingCheck(private val context: Context) {
    fun enabled(): Tri {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return Tri.UNKNOWN
        return try {
            val value = Settings.Global.getInt(context.contentResolver, KEY)
            when (value) {
                1 -> Tri.YES
                0 -> Tri.NO
                else -> Tri.UNKNOWN
            }
        } catch (ignored: Settings.SettingNotFoundException) {
            Tri.UNKNOWN
        }
    }

    private companion object {
        // Hidden on API 30+, but still readable; best effort only.
        const val KEY = "adb_wifi_enabled"
    }
}
