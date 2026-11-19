package dev.setu.mobile.feature.host

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.setu.mobile.feature.host.R

@Composable
fun HostScreen(viewModel: HostViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    HostContent(state, viewModel::start, viewModel::stop, viewModel::newCode)
}

@Composable
fun HostContent(
    state: HostUiState,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onNewCode: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(text = statusLabel(state.status), style = MaterialTheme.typography.titleLarge)
        if (state.status == HostStatus.ONLINE) {
            state.deviceId?.let { Text(stringResource(R.string.host_device_id, it)) }
            if (state.pairingCode != null) {
                Text(
                    text = stringResource(R.string.host_code_label),
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = state.pairingCode,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 32.sp,
                )
            }
            state.warning?.let { Text(stringResource(R.string.host_warning, it)) }
        }
        state.message?.let { Text(messageText(it)) }
        if (state.status == HostStatus.IDLE) {
            Button(onClick = onStart, enabled = state.canStart) { Text(stringResource(R.string.host_start)) }
        }
        if (state.status == HostStatus.ONLINE && state.pairingCode != null) {
            Button(onClick = onNewCode) { Text(stringResource(R.string.host_new_code)) }
        }
        if (state.canStop) {
            Button(onClick = onStop) { Text(stringResource(R.string.host_stop)) }
        }
    }
}

@Composable
private fun statusLabel(status: HostStatus): String = stringResource(
    when (status) {
        HostStatus.IDLE -> R.string.host_status_idle
        HostStatus.STARTING -> R.string.host_status_starting
        HostStatus.ONLINE -> R.string.host_status_online
        HostStatus.RECONNECTING -> R.string.host_status_reconnecting
        HostStatus.BLOCKED -> R.string.host_status_blocked
        HostStatus.POLICY_MISSING -> R.string.host_status_policy_missing
    },
)

@Composable
private fun messageText(message: HostMessage): String = when (message) {
    HostMessage.NoRelay -> stringResource(R.string.host_no_relay)
    HostMessage.PairFailed -> stringResource(R.string.host_pair_failed)
    is HostMessage.RetryIn -> stringResource(R.string.host_retry_in, message.seconds)
}
