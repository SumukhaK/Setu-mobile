package dev.setu.mobile.feature.setup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp

@Composable
fun MiuiInstallHelp(onOpenDeveloperOptions: () -> Unit) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            TextButton(onClick = { expanded = !expanded }) {
                Text(stringResource(R.string.setup_miui_title))
            }
            if (expanded) {
                Text(
                    text = stringResource(R.string.setup_miui_body),
                    style = MaterialTheme.typography.bodyMedium,
                )
                TextButton(onClick = onOpenDeveloperOptions) {
                    Text(stringResource(R.string.setup_miui_action))
                }
            }
        }
    }
}
