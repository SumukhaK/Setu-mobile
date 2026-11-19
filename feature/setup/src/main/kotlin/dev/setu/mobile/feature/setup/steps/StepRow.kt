package dev.setu.mobile.feature.setup.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.setu.mobile.core.readiness.Tri
import dev.setu.mobile.feature.setup.R
import dev.setu.mobile.feature.setup.StepAction

@Composable
fun StepRow(
    title: String,
    state: Tri,
    body: String? = null,
    action: StepAction? = null,
    details: (@Composable () -> Unit)? = null,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                StateChip(state)
            }
            body?.let { Text(text = it, style = MaterialTheme.typography.bodyMedium) }
            details?.invoke()
            action?.let {
                TextButton(onClick = it.onClick) { Text(it.label) }
            }
        }
    }
}

@Composable
private fun StateChip(state: Tri) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.secondaryContainer,
    ) {
        Text(
            text = stringResource(chipLabel(state)),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

private fun chipLabel(state: Tri): Int = when (state) {
    Tri.YES -> R.string.setup_chip_done
    Tri.NO -> R.string.setup_chip_needed
    Tri.UNKNOWN -> R.string.setup_chip_not_checked
}
