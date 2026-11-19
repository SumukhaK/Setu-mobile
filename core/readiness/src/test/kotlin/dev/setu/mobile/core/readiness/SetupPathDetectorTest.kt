package dev.setu.mobile.core.readiness

import org.junit.Assert.assertEquals
import org.junit.Test

class SetupPathDetectorTest {
    // P04: the branch table from J2, including a policy that forbids the USB fallback.
    @Test
    fun p04BranchTable() {
        val rows = listOf(
            Row(29, onWifi = true, usbAllowed = true, expected = SetupPath.UsbTcpip),
            Row(30, onWifi = true, usbAllowed = true, expected = SetupPath.WirelessDebugging),
            Row(35, onWifi = false, usbAllowed = true, expected = SetupPath.UsbTcpip),
            Row(35, onWifi = true, usbAllowed = false, expected = SetupPath.WirelessDebugging),
            Row(
                29,
                onWifi = true,
                usbAllowed = false,
                expected = SetupPath.Unsupported(SetupPath.Reason.USB_FALLBACK_FORBIDDEN),
            ),
            Row(
                35,
                onWifi = false,
                usbAllowed = false,
                expected = SetupPath.Unsupported(SetupPath.Reason.USB_FALLBACK_FORBIDDEN),
            ),
        )

        for (row in rows) {
            assertEquals(
                "sdk=${row.sdkInt} wifi=${row.onWifi} usb=${row.usbAllowed}",
                row.expected,
                detectSetupPath(row.sdkInt, row.onWifi, row.usbAllowed),
            )
        }
    }

    private data class Row(
        val sdkInt: Int,
        val onWifi: Boolean,
        val usbAllowed: Boolean,
        val expected: SetupPath,
    )
}
