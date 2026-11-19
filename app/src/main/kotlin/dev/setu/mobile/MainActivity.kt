package dev.setu.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.genadb.sdk.ConnectionState
import dev.setu.mobile.feature.setup.AndroidDeviceProbe
import dev.setu.mobile.feature.setup.SetupScreen
import dev.setu.mobile.feature.setup.SetupViewModel
import kotlinx.coroutines.flow.MutableStateFlow

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(text = "Setu")
                        val setupViewModel = viewModel {
                            SetupViewModel(
                                probe = AndroidDeviceProbe(applicationContext),
                                // Placeholder until AT-09 supplies the EMM policy (AD-12).
                                usbFallbackAllowed = true,
                                // Placeholder until AT-06 supplies the live hosting state (AD-14).
                                connectionState = MutableStateFlow(ConnectionState.Idle),
                            )
                        }
                        SetupScreen(setupViewModel)
                    }
                }
            }
        }
    }
}
