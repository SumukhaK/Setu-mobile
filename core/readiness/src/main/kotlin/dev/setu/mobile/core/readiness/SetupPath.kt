package dev.setu.mobile.core.readiness

enum class Tri { YES, NO, UNKNOWN }

sealed interface SetupPath {
    data object WirelessDebugging : SetupPath
    data object UsbTcpip : SetupPath
    data class Unsupported(val reason: Reason) : SetupPath

    enum class Reason { USB_FALLBACK_FORBIDDEN }
}
