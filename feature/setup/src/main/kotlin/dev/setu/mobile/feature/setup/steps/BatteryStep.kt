package dev.setu.mobile.feature.setup.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.setu.mobile.core.readiness.Tri
import dev.setu.mobile.core.readiness.oem.Purpose
import dev.setu.mobile.core.readiness.oem.SettingsDestination
import dev.setu.mobile.feature.setup.R

@Composable
fun BatteryStep(
    state: Tri,
    destinations: List<SettingsDestination>,
    onOpen: (SettingsDestination) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(batteryStateLabel(state)), style = MaterialTheme.typography.bodyMedium)
        destinations.forEach { destination ->
            TextButton(onClick = { onOpen(destination) }) {
                Text(destinationLabel(destination))
            }
        }
        Text(stringResource(R.string.setup_battery_note), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun destinationLabel(destination: SettingsDestination): String {
    val base = stringResource(
        when (destination.purpose) {
            Purpose.AUTOSTART -> R.string.setup_battery_destination_autostart
            Purpose.BATTERY -> R.string.setup_battery_destination_battery
            Purpose.APP_DETAILS -> R.string.setup_battery_destination_app_details
        },
    )
    return if (destination.vendorSpecific) {
        "$base ${stringResource(R.string.setup_battery_vendor_suffix)}"
    } else {
        base
    }
}

private fun batteryStateLabel(state: Tri): Int = when (state) {
    Tri.YES -> R.string.setup_battery_state_yes
    Tri.NO -> R.string.setup_battery_state_no
    Tri.UNKNOWN -> R.string.setup_battery_state_unknown
}
