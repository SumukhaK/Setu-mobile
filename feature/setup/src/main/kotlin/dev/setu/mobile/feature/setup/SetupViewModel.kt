package dev.setu.mobile.feature.setup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.genadb.sdk.ConnectionState
import dev.setu.mobile.core.readiness.ReadinessReport
import dev.setu.mobile.core.readiness.SetupPath
import dev.setu.mobile.core.readiness.Step
import dev.setu.mobile.core.readiness.Tri
import dev.setu.mobile.core.readiness.detectSetupPath
import dev.setu.mobile.core.readiness.oem.Oem
import dev.setu.mobile.core.readiness.oem.SettingsDestination
import dev.setu.mobile.core.readiness.readiness
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class SetupUiState(
    val report: ReadinessReport,
    val oem: Oem,
    val canUnplugUsb: Boolean,
)

data class StepAction(val label: String, val onClick: () -> Unit)

data class SetupActions(
    val openDeveloperOptions: () -> Unit,
    val openWirelessDebugging: () -> Unit,
    val fixNotifications: () -> Unit,
    val open: (SettingsDestination) -> Unit,
)

class SetupViewModel(
    private val probe: DeviceProbe,
    private val usbFallbackAllowed: Boolean,
    connectionState: StateFlow<ConnectionState>,
) : ViewModel() {
    private val snapshot: MutableStateFlow<DeviceSnapshot>

    init {
        snapshot = MutableStateFlow(probe.read())
    }

    val uiState: StateFlow<SetupUiState> = combine(snapshot, connectionState) { device, state ->
        uiStateOf(device, state)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = uiStateOf(snapshot.value, connectionState.value),
    )

    fun recheck() {
        snapshot.value = probe.read()
    }

    private fun uiStateOf(device: DeviceSnapshot, state: ConnectionState): SetupUiState {
        val report = readiness(
            path = detectSetupPath(device.sdkInt, device.onWifi, usbFallbackAllowed),
            checks = device.checks,
            state = state,
        )
        return SetupUiState(
            report = report,
            oem = device.oem,
            canUnplugUsb = report.path == SetupPath.UsbTcpip &&
                report.steps[Step.USB_TCPIP_ENDPOINT] == Tri.YES,
        )
    }
}
