package dev.setu.mobile.feature.setup

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.Lifecycle
import dev.genadb.sdk.ConnectionState
import dev.setu.mobile.core.readiness.DeviceChecks
import dev.setu.mobile.core.readiness.Tri
import dev.setu.mobile.core.readiness.oem.Oem
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class SetupScreenRecheckTest {
    @get:Rule
    val compose = createAndroidComposeRule<ComponentActivity>()

    // P04: returning from Settings triggers a fresh device read.
    @Test
    fun p04ReturningFromSettingsRechecksTheDevice() {
        val probe = FakeProbe(
            DeviceSnapshot(
                sdkInt = 35,
                onWifi = true,
                checks = DeviceChecks(Tri.NO, Tri.UNKNOWN, Tri.YES, Tri.YES),
                oem = Oem.OTHER,
            ),
        )
        val viewModel = SetupViewModel(
            probe = probe,
            usbFallbackAllowed = true,
            connectionState = MutableStateFlow(ConnectionState.Idle),
        )
        compose.setContent {
            SetupScreen(viewModel)
        }
        val readsBefore = probe.reads

        compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)

        assertTrue(probe.reads > readsBefore)
    }

    private class FakeProbe(private val snapshot: DeviceSnapshot) : DeviceProbe {
        var reads = 0
            private set

        override fun read(): DeviceSnapshot {
            reads += 1
            return snapshot
        }
    }
}
