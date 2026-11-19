package dev.setu.mobile.feature.setup

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.setu.mobile.core.readiness.RecheckOnResume
import dev.setu.mobile.core.readiness.SetupPath
import dev.setu.mobile.core.readiness.Step
import dev.setu.mobile.core.readiness.Tri
import dev.setu.mobile.core.readiness.oem.Oem
import dev.setu.mobile.core.readiness.oem.OemIntents
import dev.setu.mobile.core.readiness.oem.SettingsDestination
import dev.setu.mobile.feature.setup.steps.BatteryStep
import dev.setu.mobile.feature.setup.steps.StepRow
import dev.setu.mobile.feature.setup.steps.UsbBootstrapStep

@Composable
fun SetupScreen(viewModel: SetupViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, viewModel) {
        val observer = RecheckOnResume(viewModel::recheck)
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val context = LocalContext.current
    val destinations = remember(state.oem) { OemIntents(context).destinations(state.oem) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        viewModel.recheck()
    }
    val actions = SetupActions(
        openDeveloperOptions = {
            val enabled = state.report.steps[Step.DEVELOPER_OPTIONS] ?: Tri.UNKNOWN
            context.startActivity(developerOptionsIntent(enabled))
        },
        openWirelessDebugging = { context.startActivity(wirelessDebuggingIntent()) },
        fixNotifications = {
            val needsPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                state.report.steps[Step.NOTIFICATIONS] == Tri.NO
            if (needsPermission) {
                permission.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                context.startActivity(appNotificationSettingsIntent(context.packageName))
            }
        },
        open = { destination -> context.startActivity(destination.intent) },
    )

    SetupContent(state, destinations, actions)
}

@Composable
fun SetupContent(state: SetupUiState, destinations: List<SettingsDestination>, actions: SetupActions) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = pathLabel(state.report.path),
            style = MaterialTheme.typography.titleLarge,
        )
        if (state.report.path is SetupPath.Unsupported) return@Column
        state.report.steps.forEach { (step, stepState) ->
            StepFor(step, stepState, state, destinations, actions)
        }
        if (state.oem == Oem.XIAOMI) {
            MiuiInstallHelp(onOpenDeveloperOptions = actions.openDeveloperOptions)
        }
    }
}

@Composable
private fun StepFor(
    step: Step,
    stepState: Tri,
    screen: SetupUiState,
    destinations: List<SettingsDestination>,
    actions: SetupActions,
) {
    when (step) {
        Step.DEVELOPER_OPTIONS -> StepRow(
            title = stringResource(R.string.setup_step_developer_options),
            state = stepState,
            body = stringResource(R.string.setup_step_developer_options_body),
            action = StepAction(
                label = stringResource(R.string.setup_action_open_settings),
                onClick = actions.openDeveloperOptions,
            ),
        )
        Step.WIRELESS_DEBUGGING -> StepRow(
            title = stringResource(R.string.setup_step_wireless_debugging),
            state = stepState,
            body = stringResource(R.string.setup_step_wireless_debugging_body),
            action = StepAction(
                label = stringResource(R.string.setup_action_open_developer_options),
                onClick = actions.openWirelessDebugging,
            ),
        )
        Step.USB_TCPIP_ENDPOINT -> StepRow(
            title = stringResource(R.string.setup_step_usb),
            state = stepState,
            details = { UsbBootstrapStep(canUnplugUsb = screen.canUnplugUsb) },
        )
        Step.NOTIFICATIONS -> StepRow(
            title = stringResource(R.string.setup_step_notifications),
            state = stepState,
            body = stringResource(R.string.setup_step_notifications_body),
            action = StepAction(
                label = stringResource(R.string.setup_action_allow_notifications),
                onClick = actions.fixNotifications,
            ),
        )
        Step.BATTERY -> StepRow(
            title = stringResource(R.string.setup_step_battery),
            state = stepState,
            details = {
                BatteryStep(
                    state = stepState,
                    destinations = destinations,
                    onOpen = actions.open,
                )
            },
        )
        Step.AGENT_REACHES_ADBD -> StepRow(
            title = stringResource(R.string.setup_step_agent),
            state = stepState,
            body = stringResource(R.string.setup_step_agent_body),
        )
    }
}

@Composable
private fun pathLabel(path: SetupPath): String = when (path) {
    SetupPath.WirelessDebugging -> stringResource(R.string.setup_path_wireless)
    SetupPath.UsbTcpip -> stringResource(R.string.setup_path_usb)
    is SetupPath.Unsupported -> stringResource(R.string.setup_path_unsupported)
}
