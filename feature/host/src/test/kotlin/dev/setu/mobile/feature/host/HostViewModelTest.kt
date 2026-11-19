package dev.setu.mobile.feature.host

import app.cash.turbine.test
import dev.genadb.sdk.ConnectionState
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HostViewModelTest {
    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // P03/P10: every SDK state maps to a status; Online carries the SDK's own values verbatim.
    @Test
    fun p03MappingTableForEveryConnectionState() {
        val connection = MutableStateFlow<ConnectionState>(ConnectionState.Idle)
        val viewModel = HostViewModel(connection, FakeActions(), relayConfigured = true)
        val cases = listOf(
            ConnectionState.Idle to HostStatus.IDLE,
            ConnectionState.Starting to HostStatus.STARTING,
            ConnectionState.Online(deviceId = "dev-1") to HostStatus.ONLINE,
            ConnectionState.Reconnecting(attempt = 1, reason = null, retryInMs = -1) to HostStatus.RECONNECTING,
            ConnectionState.Blocked(reason = "policy") to HostStatus.BLOCKED,
            ConnectionState.PolicyMissing(missing = "policy_json") to HostStatus.POLICY_MISSING,
        )

        cases.forEach { (state, expected) ->
            connection.value = state
            assertEquals(expected, viewModel.uiState.value.status)
        }

        connection.value = ConnectionState.Online(
            deviceId = "dev-9",
            pairingCode = "1234-567890",
            warning = "adbd_unreachable",
        )
        val online = viewModel.uiState.value
        assertEquals("dev-9", online.deviceId)
        assertEquals("1234-567890", online.pairingCode)
        assertEquals("adbd_unreachable", online.warning)
    }

    // AT-06: -1 means no countdown; 2500 ms rounds up to 3 seconds.
    @Test
    fun p10ReconnectingWithoutRetryHasNoMessage() {
        val connection = MutableStateFlow<ConnectionState>(
            ConnectionState.Reconnecting(attempt = 1, reason = null, retryInMs = -1),
        )
        val viewModel = HostViewModel(connection, FakeActions(), relayConfigured = true)

        assertEquals(HostStatus.RECONNECTING, viewModel.uiState.value.status)
        assertNull(viewModel.uiState.value.message)
    }

    @Test
    fun p10ReconnectingRetryRoundsUp() {
        val connection = MutableStateFlow<ConnectionState>(
            ConnectionState.Reconnecting(attempt = 2, reason = "restart", retryInMs = 2500),
        )
        val viewModel = HostViewModel(connection, FakeActions(), relayConfigured = true)

        assertEquals(HostMessage.RetryIn(3), viewModel.uiState.value.message)
    }

    // P03: the shown code is always the agent's Online.pairingCode, never pair()'s result.
    @Test
    fun p03NewCodeNeverReplacesTheAgentsCode() = runTest {
        val connection = MutableStateFlow<ConnectionState>(
            ConnectionState.Online(deviceId = "dev-1", pairingCode = "111111"),
        )
        val actions = FakeActions().apply { pairResult = "999999" }
        val viewModel = HostViewModel(connection, actions, relayConfigured = true)

        viewModel.uiState.test {
            assertEquals("111111", awaitItem().pairingCode)
            viewModel.newCode()
            assertEquals(1, actions.pairCount)
            connection.value = ConnectionState.Online(deviceId = "dev-1", pairingCode = "222222")
            assertEquals("222222", awaitItem().pairingCode)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // AT-06: a pair failure is a one-shot message, cleared by the next state emission.
    @Test
    fun p03PairFailureIsOneShot() = runTest {
        val connection = MutableStateFlow<ConnectionState>(
            ConnectionState.Online(deviceId = "dev-1", pairingCode = "111111"),
        )
        val actions = FakeActions().apply { pairError = IllegalStateException("boom") }
        val viewModel = HostViewModel(connection, actions, relayConfigured = true)

        viewModel.uiState.test {
            assertNull(awaitItem().message)
            viewModel.newCode()
            assertEquals(HostMessage.PairFailed, awaitItem().message)
            connection.value = ConnectionState.Online(deviceId = "dev-1", pairingCode = "222222")
            assertNull(awaitItem().message)
            cancelAndIgnoreRemainingEvents()
        }
    }

    // AT-06 / P10: only an Idle, relay-configured phone can start; any non-Idle state can stop.
    @Test
    fun p10StartAndStopEligibility() {
        val connection = MutableStateFlow<ConnectionState>(ConnectionState.Idle)
        val viewModel = HostViewModel(connection, FakeActions(), relayConfigured = true)

        assertTrue(viewModel.uiState.value.canStart)
        assertFalse(viewModel.uiState.value.canStop)

        connection.value = ConnectionState.Online(deviceId = "dev-1")
        assertFalse(viewModel.uiState.value.canStart)
        assertTrue(viewModel.uiState.value.canStop)
    }

    // AT-06: no relay means no start and the explicit NoRelay message.
    @Test
    fun p10NoRelayBlocksStartAndShowsMessage() {
        val viewModel = HostViewModel(
            MutableStateFlow(ConnectionState.Idle),
            FakeActions(),
            relayConfigured = false,
        )

        assertFalse(viewModel.uiState.value.canStart)
        assertEquals(HostMessage.NoRelay, viewModel.uiState.value.message)
    }

    // AT-06: start/stop only call the port; state comes back through connectionState.
    @Test
    fun p10StartAndStopOnlyCallTheActions() {
        val connection = MutableStateFlow<ConnectionState>(ConnectionState.Idle)
        val actions = FakeActions()
        val viewModel = HostViewModel(connection, actions, relayConfigured = true)

        viewModel.start()
        viewModel.stop()

        assertEquals(1, actions.startCount)
        assertEquals(1, actions.stopCount)
        assertEquals(HostStatus.IDLE, viewModel.uiState.value.status)
        assertEquals(ConnectionState.Idle, connection.value)
    }

    private class FakeActions : HostingActions {
        var startCount = 0
        var stopCount = 0
        var pairCount = 0
            private set
        var pairResult: String = "9999-000000"
        var pairError: Throwable? = null

        override fun start() {
            startCount++
        }

        override fun stop() {
            stopCount++
        }

        override suspend fun pair(): String {
            pairCount++
            pairError?.let { throw it }
            return pairResult
        }
    }
}
