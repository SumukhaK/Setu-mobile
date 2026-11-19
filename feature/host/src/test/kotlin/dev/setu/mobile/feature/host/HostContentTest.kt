package dev.setu.mobile.feature.host

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class HostContentTest {
    @get:Rule
    val compose = createComposeRule()

    // P17: Stop hosting is available while hosting or reconnecting, not while idle.
    @Test
    fun p17StopHostingIsAvailableWhenHosting() {
        render(state(HostStatus.ONLINE, deviceId = "dev-1"))

        compose.onNodeWithText("Stop hosting").assertExists()
    }

    @Test
    fun p17StopHostingIsAvailableWhenReconnecting() {
        render(state(HostStatus.RECONNECTING))

        compose.onNodeWithText("Stop hosting").assertExists()
    }

    @Test
    fun p17StopHostingIsAbsentWhenIdle() {
        render(state(HostStatus.IDLE))

        compose.onAllNodesWithText("Stop hosting").assertCountEquals(0)
    }

    @Test
    fun p17StopHostingCallsOnStop() {
        var stops = 0
        render(state(HostStatus.ONLINE, deviceId = "dev-1"), onStop = { stops++ })

        compose.onNodeWithText("Stop hosting").performScrollTo().performClick()

        assertEquals(1, stops)
    }

    // P03: the code and the "New code" action exist only with a code from the agent.
    @Test
    fun p03OnlineWithCodeShowsCodeAndNewCodeAction() {
        render(state(HostStatus.ONLINE, deviceId = "dev-1", pairingCode = "1234-567890"))

        compose.onNodeWithText("1234-567890").assertExists()
        compose.onNodeWithText("Setu code: read it to the developer").assertExists()
        compose.onNodeWithText("New code").assertExists()
    }

    @Test
    fun p03OnlineWithoutCodeHidesCodeAndNewCodeAction() {
        render(state(HostStatus.ONLINE, deviceId = "dev-1"))

        compose.onAllNodesWithText("New code").assertCountEquals(0)
        compose.onAllNodesWithText("Setu code: read it to the developer").assertCountEquals(0)
    }

    // AT-06: retryInMs = -1 gives no countdown text.
    @Test
    fun p10ReconnectingWithoutMessageShowsNoCountdown() {
        render(state(HostStatus.RECONNECTING))

        compose.onAllNodesWithText("Retrying in", substring = true).assertCountEquals(0)
    }

    // AT-06: NoRelay explains the disabled start action.
    @Test
    fun p10NoRelayShowsMessageAndDisablesStart() {
        render(state(HostStatus.IDLE, message = HostMessage.NoRelay))

        compose.onNodeWithText("No relay is configured in this build.").assertExists()
        compose.onNodeWithText("Start hosting").assertIsNotEnabled()
    }

    // P01/P05: the host screen never asks for a code via a text field.
    @Test
    fun p01IdleHasNoTextField() {
        render(state(HostStatus.IDLE))

        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
    }

    @Test
    fun p03OnlineWithCodeHasNoTextField() {
        render(state(HostStatus.ONLINE, deviceId = "dev-1", pairingCode = "1234-567890"))

        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
    }

    private fun render(
        state: HostUiState,
        onStart: () -> Unit = {},
        onStop: () -> Unit = {},
        onNewCode: () -> Unit = {},
    ) {
        compose.setContent {
            MaterialTheme {
                HostContent(state, onStart, onStop, onNewCode)
            }
        }
    }

    private fun state(
        status: HostStatus,
        deviceId: String? = null,
        pairingCode: String? = null,
        message: HostMessage? = null,
    ): HostUiState = HostUiState(
        status = status,
        deviceId = deviceId,
        pairingCode = pairingCode,
        warning = null,
        canStart = status == HostStatus.IDLE && message !is HostMessage.NoRelay,
        canStop = status != HostStatus.IDLE,
        message = message,
    )
}
