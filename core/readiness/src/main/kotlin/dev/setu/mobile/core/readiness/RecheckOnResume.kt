package dev.setu.mobile.core.readiness

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner

class RecheckOnResume(private val onRecheck: () -> Unit) : DefaultLifecycleObserver {
    override fun onResume(owner: LifecycleOwner) {
        onRecheck()
    }
}
