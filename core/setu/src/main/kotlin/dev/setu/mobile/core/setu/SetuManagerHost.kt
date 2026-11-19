package dev.setu.mobile.core.setu

import dev.genadb.sdk.ConnectionState
import dev.genadb.sdk.DeviceSession
import dev.genadb.sdk.PolicyStatus
import dev.genadb.sdk.SetuConfig
import dev.genadb.sdk.SetuManager
import kotlinx.coroutines.flow.StateFlow

/** [SetuHost] backed by the SDK's [SetuManager]. Pure delegation, no logic. */
class SetuManagerHost(private val manager: SetuManager) : SetuHost {
    override val connectionState: StateFlow<ConnectionState> get() = manager.connectionState
    override val policyStatus: StateFlow<PolicyStatus> get() = manager.policyStatus
    override val sessions: StateFlow<List<DeviceSession>> get() = manager.sessions

    override fun start(config: SetuConfig?) = manager.start(config)

    override fun stop() = manager.stop()

    override fun refreshPolicy(): PolicyStatus = manager.refreshPolicy()
}
