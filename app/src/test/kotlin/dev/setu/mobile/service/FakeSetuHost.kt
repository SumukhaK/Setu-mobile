package dev.setu.mobile.service

import dev.genadb.sdk.ConnectionState
import dev.genadb.sdk.DeviceSession
import dev.genadb.sdk.PolicyStatus
import dev.genadb.sdk.SetuConfig
import dev.setu.mobile.core.setu.SetuHost
import kotlinx.coroutines.flow.MutableStateFlow

/** Recording [SetuHost] for service tests (AD-10). No SDK, no mocking library. */
class FakeSetuHost : SetuHost {
    override val connectionState: MutableStateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Idle)
    override val policyStatus: MutableStateFlow<PolicyStatus> = MutableStateFlow(PolicyStatus())
    override val sessions: MutableStateFlow<List<DeviceSession>> = MutableStateFlow(emptyList())

    /** Call names in order: "refreshPolicy", "start", "stop". */
    val calls = mutableListOf<String>()

    /** One entry per [start], including the nullable reuse-last-config case. */
    val starts = mutableListOf<SetuConfig?>()

    var stopCount = 0
        private set

    /** When set, [start] throws it after recording the call. */
    var startError: Exception? = null

    /** Scripted result for [pair] (AT-06). */
    var pairResult: String = "1234-567890"

    /** When set, [pair] throws it after recording the call. */
    var pairError: Exception? = null

    var pairCount: Int = 0
        private set

    override suspend fun pair(timeoutMs: Long): String {
        pairCount++
        pairError?.let { throw it }
        return pairResult
    }

    override fun start(config: SetuConfig?) {
        calls += "start"
        starts += config
        startError?.let { throw it }
    }

    override fun stop() {
        calls += "stop"
        stopCount++
    }

    override fun refreshPolicy(): PolicyStatus {
        calls += "refreshPolicy"
        return policyStatus.value
    }
}
