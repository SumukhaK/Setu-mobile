package dev.setu.mobile.core.readiness

import dev.genadb.sdk.ConnectionState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReadinessTest {
    // P04: the Wireless path has the J2 steps, and SDK evidence beats a NO setting.
    @Test
    fun p04WirelessPathUsesWirelessStepsAndSdkEvidence() {
        val report = readiness(
            path = SetupPath.WirelessDebugging,
            checks = checks(wirelessDebugging = Tri.NO),
            state = ConnectionState.Online(deviceId = "dev-1", adbdEndpoint = "192.168.1.5:37001"),
        )

        assertEquals(
            setOf(
                Step.DEVELOPER_OPTIONS,
                Step.WIRELESS_DEBUGGING,
                Step.NOTIFICATIONS,
                Step.BATTERY,
                Step.AGENT_REACHES_ADBD,
            ),
            report.steps.keys,
        )
        assertEquals(Tri.YES, report.steps[Step.WIRELESS_DEBUGGING])
        assertEquals(Tri.YES, report.steps[Step.AGENT_REACHES_ADBD])
        assertTrue(report.ready)
    }

    // P04/J2: adbd_unreachable is NO and blocks readiness even when the setting reads YES.
    @Test
    fun p04UnreachableAdbdIsNotReady() {
        val report = readiness(
            path = SetupPath.WirelessDebugging,
            checks = checks(wirelessDebugging = Tri.YES),
            state = ConnectionState.Online(deviceId = "dev-1", warning = "adbd_unreachable: wireless off"),
        )

        assertEquals(Tri.NO, report.steps[Step.AGENT_REACHES_ADBD])
        assertFalse(report.ready)
    }

    // P04: only the documented loopback endpoint satisfies the USB bootstrap.
    @Test
    fun p04UsbPathChecksTheLoopbackEndpoint() {
        val atEndpoint = readiness(
            path = SetupPath.UsbTcpip,
            checks = checks(),
            state = ConnectionState.Online(deviceId = "dev-1", adbdEndpoint = "127.0.0.1:5555"),
        )

        assertEquals(
            setOf(
                Step.DEVELOPER_OPTIONS,
                Step.USB_TCPIP_ENDPOINT,
                Step.NOTIFICATIONS,
                Step.BATTERY,
                Step.AGENT_REACHES_ADBD,
            ),
            atEndpoint.steps.keys,
        )
        assertEquals(Tri.YES, atEndpoint.steps[Step.USB_TCPIP_ENDPOINT])
        assertTrue(atEndpoint.ready)

        val wrongPort = readiness(
            path = SetupPath.UsbTcpip,
            checks = checks(),
            state = ConnectionState.Online(deviceId = "dev-1", adbdEndpoint = "127.0.0.1:5556"),
        )

        assertEquals(Tri.NO, wrongPort.steps[Step.USB_TCPIP_ENDPOINT])
        assertFalse(wrongPort.ready)
    }

    // P04: the adbd_unreachable warning wins over a loopback endpoint.
    @Test
    fun p04UsbEndpointWithUnreachableWarningIsNotReady() {
        val report = readiness(
            path = SetupPath.UsbTcpip,
            checks = checks(),
            state = ConnectionState.Online(
                deviceId = "dev-1",
                adbdEndpoint = "127.0.0.1:5555",
                warning = "adbd_unreachable: wireless off",
            ),
        )

        assertEquals(Tri.NO, report.steps[Step.USB_TCPIP_ENDPOINT])
        assertFalse(report.ready)
    }

    // P04: Online without an endpoint or a warning says nothing about the USB bootstrap.
    @Test
    fun p04UsbEndpointWithoutEndpointIsUnknown() {
        val report = readiness(
            path = SetupPath.UsbTcpip,
            checks = checks(),
            state = ConnectionState.Online(deviceId = "dev-1"),
        )

        assertEquals(Tri.UNKNOWN, report.steps[Step.USB_TCPIP_ENDPOINT])
    }

    // P04: Idle leaves the SDK-backed steps unknown without blocking the rest.
    @Test
    fun p04IdleLeavesSdkStepsUnknown() {
        val report = readiness(
            path = SetupPath.UsbTcpip,
            checks = checks(),
            state = ConnectionState.Idle,
        )

        assertEquals(Tri.UNKNOWN, report.steps[Step.USB_TCPIP_ENDPOINT])
        assertEquals(Tri.UNKNOWN, report.steps[Step.AGENT_REACHES_ADBD])
        assertTrue(report.ready)
    }

    // P06/P04: notification denial is still NO in the report; AT-05 decides how to present it.
    @Test
    fun p04NotificationDenialIsNotReady() {
        val report = readiness(
            path = SetupPath.WirelessDebugging,
            checks = checks(wirelessDebugging = Tri.YES, notifications = Tri.NO),
            state = ConnectionState.Idle,
        )

        assertEquals(Tri.NO, report.steps[Step.NOTIFICATIONS])
        assertFalse(report.ready)
    }

    // P04 battery: both supported paths report the battery step.
    @Test
    fun p04BothPathsIncludeTheBatteryStep() {
        val wireless = readiness(
            path = SetupPath.WirelessDebugging,
            checks = checks(wirelessDebugging = Tri.YES),
            state = ConnectionState.Idle,
        )
        val usb = readiness(
            path = SetupPath.UsbTcpip,
            checks = checks(),
            state = ConnectionState.Idle,
        )

        assertEquals(Tri.YES, wireless.steps[Step.BATTERY])
        assertEquals(Tri.YES, usb.steps[Step.BATTERY])
    }

    // P04 battery: an optimized app counts as NO and blocks readiness, like notifications.
    @Test
    fun p04OptimizedBatteryIsNotReady() {
        val report = readiness(
            path = SetupPath.WirelessDebugging,
            checks = checks(wirelessDebugging = Tri.YES, battery = Tri.NO),
            state = ConnectionState.Idle,
        )

        assertEquals(Tri.NO, report.steps[Step.BATTERY])
        assertFalse(report.ready)
    }

    // P04 battery: an unreadable battery state does not block the rest.
    @Test
    fun p04UnknownBatteryDoesNotBlockReadiness() {
        val report = readiness(
            path = SetupPath.UsbTcpip,
            checks = checks(notifications = Tri.UNKNOWN, battery = Tri.UNKNOWN),
            state = ConnectionState.Online(deviceId = "dev-1", adbdEndpoint = "127.0.0.1:5555"),
        )

        assertEquals(Tri.UNKNOWN, report.steps[Step.BATTERY])
        assertTrue(report.ready)
    }

    // P04: a policy-forbidden USB fallback reports no steps and is never ready.
    @Test
    fun p04UnsupportedPathIsNeverReady() {
        val report = readiness(
            path = SetupPath.Unsupported(SetupPath.Reason.USB_FALLBACK_FORBIDDEN),
            checks = checks(wirelessDebugging = Tri.YES),
            state = ConnectionState.Online(deviceId = "dev-1", adbdEndpoint = "192.168.1.5:37001"),
        )

        assertTrue(report.steps.isEmpty())
        assertFalse(report.ready)
    }

    // Only the test helper relaxes the four checks; production DeviceChecks has no defaults.
    private fun checks(
        developerOptions: Tri = Tri.YES,
        wirelessDebugging: Tri = Tri.UNKNOWN,
        notifications: Tri = Tri.YES,
        battery: Tri = Tri.YES,
    ): DeviceChecks = DeviceChecks(developerOptions, wirelessDebugging, notifications, battery)
}
