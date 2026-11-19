package dev.setu.mobile.core.readiness

import android.content.Context
import android.provider.Settings

class DeveloperOptionsCheck(private val context: Context) {
    fun enabled(): Tri = try {
        val enabled = Settings.Global.getInt(
            context.contentResolver,
            Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
        ) == 1
        if (enabled) Tri.YES else Tri.NO
    } catch (ignored: Settings.SettingNotFoundException) {
        Tri.NO
    }
}
