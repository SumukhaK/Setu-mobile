package dev.setu.mobile.service

import dev.genadb.sdk.ConnectionState
import dev.setu.mobile.core.setu.SetuHost
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn

/**
 * Process-wide access to the attached host's state (AD-15). Only HostingService
 * attaches and detaches; the UI reads [connectionState] and calls [pair].
 * Never call SetuManager.getInstance from the UI: it creates a second instance.
 */
object HostingRegistry {
    private val attached = MutableStateFlow<SetuHost?>(null)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    val connectionState: StateFlow<ConnectionState> = attached
        .flatMapLatest { it?.connectionState ?: flowOf(ConnectionState.Idle) }
        .stateIn(scope, SharingStarted.Eagerly, ConnectionState.Idle)

    suspend fun pair(): String = attached.value?.pair() ?: error("not hosting")

    internal fun attach(host: SetuHost) {
        attached.value = host
    }

    internal fun detach(host: SetuHost) {
        if (attached.value === host) attached.value = null
    }
}
