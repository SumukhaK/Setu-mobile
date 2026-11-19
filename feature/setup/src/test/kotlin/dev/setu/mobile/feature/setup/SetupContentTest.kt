package dev.setu.mobile.feature.setup

import android.content.Intent
import android.provider.Settings
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import dev.setu.mobile.core.readiness.ReadinessReport
import dev.setu.mobile.core.readiness.SetupPath
import dev.setu.mobile.core.readiness.Step
import dev.setu.mobile.core.readiness.Tri
import dev.setu.mobile.core.readiness.oem.Oem
import dev.setu.mobile.core.readiness.oem.Purpose
import dev.setu.mobile.core.readiness.oem.SettingsDestination
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class SetupContentTest {
    @get:Rule
    val compose = createComposeRule()

    // P04: a forbidden fallback shows only the IT/Wi-Fi message.
    @Test
    fun p04UnsupportedShowsOnlyThePolicyMessage() {
        render(state(SetupPath.Unsupported(SetupPath.Reason.USB_FALLBACK_FORBIDDEN), emptyMap()))

        compose.onNodeWithText(
            "This phone can't use the USB fallback here. Contact IT or connect to a supported Wi-Fi network.",
        ).assertExists()
        compose.onAllNodesWithText("Developer options").assertCountEquals(0)
        compose.onAllNodesWithText("USB connection").assertCountEquals(0)
    }

    // P04: the cable gate follows the USB endpoint state.
    @Test
    fun p04UsbCableGateStaysClosed() {
        render(state(SetupPath.UsbTcpip, usbSteps(), canUnplugUsb = false))

        compose.onNodeWithText("Don't unplug yet", substring = true).assertExists()
    }

    @Test
    fun p04UsbCableGateOpens() {
        render(state(SetupPath.UsbTcpip, usbSteps(), canUnplugUsb = true))

        compose.onNodeWithText("You can unplug", substring = true).assertExists()
    }

    // P04 OEM: the MIUI install help appears only for Xiaomi.
    @Test
    fun p04MiuiHelpOnlyForXiaomi() {
        render(state(SetupPath.WirelessDebugging, wirelessSteps(), oem = Oem.XIAOMI))

        compose.onNodeWithText("Install failed on a Xiaomi phone?").assertExists()
    }

    @Test
    fun p04MiuiHelpHiddenForOtherOems() {
        render(state(SetupPath.WirelessDebugging, wirelessSteps(), oem = Oem.OTHER))

        compose.onAllNodesWithText("Install failed on a Xiaomi phone?").assertCountEquals(0)
    }

    // P04 OEM: each destination is a button labelled by purpose, with the vendor suffix.
    @Test
    fun p04BatteryDestinationButtonsOpenTheirIntent() {
        val battery = SettingsDestination(
            purpose = Purpose.BATTERY,
            intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
            vendorSpecific = true,
        )
        val appDetails = SettingsDestination(
            purpose = Purpose.APP_DETAILS,
            intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS),
            vendorSpecific = false,
        )
        var opened: SettingsDestination? = null
        render(
            state = state(SetupPath.UsbTcpip, usbSteps()),
            destinations = listOf(battery, appDetails),
            actions = actions(open = { opened = it }),
        )

        compose.onNodeWithText("Battery settings (phone maker)").performScrollTo().performClick()

        assertEquals(battery, opened)
        compose.onNodeWithText("App info").assertExists()
    }

    // P06: denial keeps the note and the action.
    @Test
    fun p06NotificationDenialOffersTheActionAndNote() {
        var fixed = false
        render(
            state = state(
                SetupPath.WirelessDebugging,
                wirelessSteps(notifications = Tri.NO),
            ),
            actions = actions(fixNotifications = { fixed = true }),
        )

        compose.onNodeWithText("Hosting still works", substring = true).assertExists()
        compose.onNodeWithText("Allow notifications").performScrollTo().performClick()

        assertTrue(fixed)
    }

    // P05 phone half: no step ever asks for the system pairing code.
    @Test
    fun p05WirelessPathHasNoTextField() {
        render(state(SetupPath.WirelessDebugging, wirelessSteps()))

        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
    }

    @Test
    fun p05UsbPathHasNoTextField() {
        render(state(SetupPath.UsbTcpip, usbSteps()))

        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
    }

    private fun render(
        state: SetupUiState,
        destinations: List<SettingsDestination> = emptyList(),
        actions: SetupActions = actions(),
    ) {
        compose.setContent {
            MaterialTheme {
                SetupContent(state, destinations, actions)
            }
        }
    }

    private fun state(
        path: SetupPath,
        steps: Map<Step, Tri>,
        oem: Oem = Oem.OTHER,
        canUnplugUsb: Boolean = false,
    ): SetupUiState = SetupUiState(ReadinessReport(path, steps), oem, canUnplugUsb)

    private fun actions(
        openDeveloperOptions: () -> Unit = {},
        openWirelessDebugging: () -> Unit = {},
        fixNotifications: () -> Unit = {},
        open: (SettingsDestination) -> Unit = {},
    ): SetupActions = SetupActions(openDeveloperOptions, openWirelessDebugging, fixNotifications, open)

    private fun wirelessSteps(notifications: Tri = Tri.YES): Map<Step, Tri> = mapOf(
        Step.DEVELOPER_OPTIONS to Tri.YES,
        Step.WIRELESS_DEBUGGING to Tri.YES,
        Step.NOTIFICATIONS to notifications,
        Step.BATTERY to Tri.YES,
        Step.AGENT_REACHES_ADBD to Tri.UNKNOWN,
    )

    private fun usbSteps(): Map<Step, Tri> = mapOf(
        Step.DEVELOPER_OPTIONS to Tri.YES,
        Step.USB_TCPIP_ENDPOINT to Tri.NO,
        Step.NOTIFICATIONS to Tri.YES,
        Step.BATTERY to Tri.YES,
        Step.AGENT_REACHES_ADBD to Tri.UNKNOWN,
    )
}
