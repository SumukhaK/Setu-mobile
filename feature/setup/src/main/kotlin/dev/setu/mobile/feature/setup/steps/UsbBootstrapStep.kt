package dev.setu.mobile.feature.setup.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.setu.mobile.feature.setup.R

@Composable
fun UsbBootstrapStep(canUnplugUsb: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.setup_usb_step_connect), style = MaterialTheme.typography.bodyMedium)
        Text(stringResource(R.string.setup_usb_step_allow), style = MaterialTheme.typography.bodyMedium)
        Text(stringResource(R.string.setup_usb_step_tcpip), style = MaterialTheme.typography.bodyMedium)
        Text(stringResource(R.string.setup_usb_step_keep_cable), style = MaterialTheme.typography.bodyMedium)
        Text(
            text = stringResource(
                if (canUnplugUsb) R.string.setup_usb_unplug_ready else R.string.setup_usb_unplug_wait,
            ),
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(stringResource(R.string.setup_usb_caution), style = MaterialTheme.typography.bodySmall)
    }
}
