package dev.setu.mobile.feature.setup

import app.cash.turbine.test
import dev.genadb.sdk.ConnectionState
import dev.setu.mobile.core.readiness.DeviceChecks
import dev.setu.mobile.core.readiness.SetupPath
import dev.setu.mobile.core.readiness.Step
import dev.setu.mobile.core.readiness.Tri
import dev.setu.mobile.core.readiness.oem.Oem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SetupViewModelTest {
    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // P04: Android 11+ on Wi-Fi selects the Wireless path with its five steps in order.
    @Test
    fun p04WirelessPathOnWifi() = runTest {
        val viewModel = viewModel(probe = FakeProbe(snapshot(sdkInt = 35, onWifi = true)))

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(SetupPath.WirelessDebugging, state.report.path)
            assertEquals(
                listOf(
                    Step.DEVELOPER_OPTIONS,
                    Step.WIRELESS_DEBUGGING,
                    Step.NOTIFICATIONS,
                    Step.BATTERY,
                    Step.AGENT_REACHES_ADBD,
                ),
                state.report.steps.keys.toList(),
            )
            cancelAndIgnoreRemainingEvents()
        }
    }

    // P04: Android 10 selects USB, and unplugging stays blocked until the SDK confirms.
    @Test
    fun p04UsbPathStartsLockedWhileIdle() {
        val viewModel = viewModel(probe = FakeProbe(snapshot(sdkInt = 29)))

        assertEquals(SetupPath.UsbTcpip, viewModel.uiState.value.report.path)
        assertFalse(viewModel.uiState.value.canUnplugUsb)
    }

    // P04: the loopback endpoint unlocks unplugging without a device recheck.
    @Test
    fun p04OnlineLoopbackUnlocksUnplugWithoutRecheck() = runTest {
        val probe = FakeProbe(snapshot(sdkInt = 29))
        val connection = MutableStateFlow<ConnectionState>(ConnectionState.Idle)
        val viewModel = SetupViewModel(probe, usbFallbackAllowed = true, connectionState = connection)

        viewModel.uiState.test {
            assertFalse(awaitItem().canUnplugUsb)
            connection.value = ConnectionState.Online(deviceId = "dev-1", adbdEndpoint = "127.0.0.1:5555")
            val unlocked = awaitItem()
            assertTrue(unlocked.canUnplugUsb)
            assertEquals(Tri.YES, unlocked.report.steps[Step.USB_TCPIP_ENDPOINT])
            assertEquals(1, probe.reads)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // P04: another endpoint is NO and keeps the cable gate closed.
    @Test
    fun p04OtherEndpointKeepsUnplugLocked() = runTest {
        val connection = MutableStateFlow<ConnectionState>(ConnectionState.Idle)
        val viewModel = viewModel(probe = FakeProbe(snapshot(sdkInt = 29)), connection = connection)

        viewModel.uiState.test {
            assertFalse(awaitItem().canUnplugUsb)
            connection.value = ConnectionState.Online(deviceId = "dev-1", adbdEndpoint = "127.0.0.1:5556")
            val locked = awaitItem()
            assertFalse(locked.canUnplugUsb)
            assertEquals(Tri.NO, locked.report.steps[Step.USB_TCPIP_ENDPOINT])
            cancelAndIgnoreRemainingEvents()
        }
    }

    // P04: a forbidden fallback on cellular is unsupported, with no steps.
    @Test
    fun p04ForbiddenFallbackIsUnsupported() {
        val viewModel = SetupViewModel(
            probe = FakeProbe(snapshot(sdkInt = 35, onWifi = false)),
            usbFallbackAllowed = false,
            connectionState = MutableStateFlow(ConnectionState.Idle),
        )

        assertTrue(viewModel.uiState.value.report.path is SetupPath.Unsupported)
        assertTrue(viewModel.uiState.value.report.steps.isEmpty())
    }

    // P04: recheck re-reads the device and reflects the new developer-options state.
    @Test
    fun p04RecheckReadsTheProbeAgain() = runTest {
        val probe = FakeProbe(snapshot(checks = checks(developerOptions = Tri.NO)))
        val viewModel = SetupViewModel(
            probe,
            usbFallbackAllowed = true,
            connectionState = MutableStateFlow(ConnectionState.Idle),
        )

        viewModel.uiState.test {
            assertEquals(Tri.NO, awaitItem().report.steps[Step.DEVELOPER_OPTIONS])
            probe.snapshot = snapshot(checks = checks(developerOptions = Tri.YES))
            viewModel.recheck()
            assertEquals(Tri.YES, awaitItem().report.steps[Step.DEVELOPER_OPTIONS])
            assertEquals(2, probe.reads)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // P04: construction reads the probe exactly once.
    @Test
    fun p04InitReadsOnce() {
        val probe = FakeProbe(snapshot())

        SetupViewModel(probe, usbFallbackAllowed = true, connectionState = MutableStateFlow(ConnectionState.Idle))

        assertEquals(1, probe.reads)
    }

    private fun viewModel(
        probe: FakeProbe,
        connection: MutableStateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Idle),
    ): SetupViewModel = SetupViewModel(probe, usbFallbackAllowed = true, connectionState = connection)

    private fun snapshot(
        sdkInt: Int = 35,
        onWifi: Boolean = true,
        checks: DeviceChecks = checks(),
        oem: Oem = Oem.OTHER,
    ): DeviceSnapshot = DeviceSnapshot(sdkInt, onWifi, checks, oem)

    private fun checks(
        developerOptions: Tri = Tri.NO,
        wirelessDebugging: Tri = Tri.UNKNOWN,
        notifications: Tri = Tri.YES,
        battery: Tri = Tri.YES,
    ): DeviceChecks = DeviceChecks(developerOptions, wirelessDebugging, notifications, battery)

    private class FakeProbe(var snapshot: DeviceSnapshot) : DeviceProbe {
        var reads = 0
            private set

        override fun read(): DeviceSnapshot {
            reads += 1
            return snapshot
        }
    }
}
