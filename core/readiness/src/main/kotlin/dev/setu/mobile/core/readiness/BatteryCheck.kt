package dev.setu.mobile.core.readiness

import android.content.Context
import android.os.PowerManager

class BatteryCheck(private val context: Context) {
    fun ignoringOptimizations(): Tri {
        val manager = context.getSystemService(PowerManager::class.java) ?: return Tri.NO
        return if (manager.isIgnoringBatteryOptimizations(context.packageName)) Tri.YES else Tri.NO
    }
}
