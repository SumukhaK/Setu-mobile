package dev.setu.mobile.core.readiness

import dev.genadb.sdk.ConnectionState

enum class Step { DEVELOPER_OPTIONS, WIRELESS_DEBUGGING, USB_TCPIP_ENDPOINT, NOTIFICATIONS, AGENT_REACHES_ADBD }

data class ReadinessReport(val path: SetupPath, val steps: Map<Step, Tri>) {
    val ready: Boolean get() = path !is SetupPath.Unsupported && steps.values.none { it == Tri.NO }
}

fun readiness(
    path: SetupPath,
    developerOptions: Tri,
    wirelessDebugging: Tri,
    notifications: Tri,
    state: ConnectionState,
): ReadinessReport {
    if (path is SetupPath.Unsupported) return ReadinessReport(path, emptyMap())

    val agent = agentStep(state)
    val sdkWireless = if (agent == Tri.YES) Tri.YES else wirelessDebugging
    val steps = if (path is SetupPath.WirelessDebugging) {
        mapOf(
            Step.DEVELOPER_OPTIONS to developerOptions,
            Step.WIRELESS_DEBUGGING to sdkWireless,
            Step.NOTIFICATIONS to notifications,
            Step.AGENT_REACHES_ADBD to agent,
        )
    } else {
        mapOf(
            Step.DEVELOPER_OPTIONS to developerOptions,
            Step.USB_TCPIP_ENDPOINT to usbEndpointStep(state),
            Step.NOTIFICATIONS to notifications,
            Step.AGENT_REACHES_ADBD to agent,
        )
    }
    return ReadinessReport(path, steps)
}

private fun agentStep(state: ConnectionState): Tri = when {
    state !is ConnectionState.Online -> Tri.UNKNOWN
    state.warning?.contains("adbd_unreachable") == true -> Tri.NO
    state.adbdEndpoint != null -> Tri.YES
    else -> Tri.UNKNOWN
}

private fun usbEndpointStep(state: ConnectionState): Tri = when {
    state !is ConnectionState.Online -> Tri.UNKNOWN
    state.warning?.contains("adbd_unreachable") == true -> Tri.NO
    state.adbdEndpoint == LOOPBACK_ENDPOINT -> Tri.YES
    state.adbdEndpoint != null -> Tri.NO
    else -> Tri.UNKNOWN
}

private const val LOOPBACK_ENDPOINT = "127.0.0.1:5555"
