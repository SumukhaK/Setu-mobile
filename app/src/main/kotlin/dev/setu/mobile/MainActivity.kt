package dev.setu.mobile

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.setu.mobile.feature.host.HostScreen
import dev.setu.mobile.feature.host.HostViewModel
import dev.setu.mobile.feature.host.HostingActions
import dev.setu.mobile.feature.setup.AndroidDeviceProbe
import dev.setu.mobile.feature.setup.SetupScreen
import dev.setu.mobile.feature.setup.SetupViewModel
import dev.setu.mobile.service.HostingRegistry
import dev.setu.mobile.service.HostingService

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val actions = ActivityHostingActions(applicationContext)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(text = "Setu")
                        var tab by rememberSaveable { mutableIntStateOf(PREPARE_TAB) }
                        TabRow(selectedTabIndex = tab) {
                            Tab(
                                selected = tab == PREPARE_TAB,
                                onClick = { tab = PREPARE_TAB },
                                text = { Text("Prepare") },
                            )
                            Tab(selected = tab == HOST_TAB, onClick = { tab = HOST_TAB }, text = { Text("Host") })
                        }
                        when (tab) {
                            PREPARE_TAB -> {
                                val setupViewModel = viewModel {
                                    SetupViewModel(
                                        probe = AndroidDeviceProbe(applicationContext),
                                        // Placeholder until AT-09 supplies the EMM policy (AD-12).
                                        usbFallbackAllowed = true,
                                        connectionState = HostingRegistry.connectionState,
                                    )
                                }
                                SetupScreen(setupViewModel)
                            }
                            HOST_TAB -> {
                                val hostViewModel = viewModel {
                                    HostViewModel(
                                        connectionState = HostingRegistry.connectionState,
                                        actions = actions,
                                        relayConfigured = BuildConfig.SETU_RELAY_URL.isNotBlank(),
                                    )
                                }
                                HostScreen(hostViewModel)
                            }
                        }
                    }
                }
            }
        }
    }

    private companion object {
        const val PREPARE_TAB = 0
        const val HOST_TAB = 1
    }
}

/** The app-side adapter for the feature's ports; only HostingService starts or stops the SDK (AD-1). */
private class ActivityHostingActions(private val context: Context) : HostingActions {
    override fun start() = HostingService.start(context, BuildConfig.SETU_RELAY_URL)

    override fun stop() = HostingService.stop(context)

    override suspend fun pair(): String = HostingRegistry.pair()
}
