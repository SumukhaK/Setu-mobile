package dev.setu.mobile.core.setu

import dev.genadb.sdk.ConnectionState
import dev.genadb.sdk.DeviceSession
import dev.genadb.sdk.PolicyStatus
import dev.genadb.sdk.SetuConfig
import kotlinx.coroutines.flow.StateFlow

/**
 * The only seam between the app and the Setu SDK (AD-7). Exposes SDK model
 * types directly; add mappers or domain models only when a feature needs them.
 */
interface SetuHost {
    val connectionState: StateFlow<ConnectionState>
    val policyStatus: StateFlow<PolicyStatus>
    val sessions: StateFlow<List<DeviceSession>>

    /** A null [config] reuses the last one, matching the SDK. */
    fun start(config: SetuConfig? = null)

    fun stop()

    fun refreshPolicy(): PolicyStatus
}
