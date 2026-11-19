package dev.setu.mobile.core.readiness.oem

import org.junit.Assert.assertEquals
import org.junit.Test

class OemTest {
    // P04 OEM: family detection reads manufacturer or brand, case-insensitively.
    @Test
    fun p04OemFamilyTable() {
        val rows = listOf(
            Row("Xiaomi", "Redmi", Oem.XIAOMI),
            Row("Xiaomi", "POCO", Oem.XIAOMI),
            Row("XIAOMI", "xiaomi", Oem.XIAOMI),
            Row("samsung", "samsung", Oem.SAMSUNG),
            Row("OPPO", "OPPO", Oem.COLOROS),
            Row("realme", "realme", Oem.COLOROS),
            Row("OnePlus", "OnePlus", Oem.COLOROS),
            Row("Google", "google", Oem.OTHER),
            Row("unknown", "redmi", Oem.XIAOMI),
        )

        for (row in rows) {
            assertEquals(
                "manufacturer=${row.manufacturer} brand=${row.brand}",
                row.expected,
                oemOf(row.manufacturer, row.brand),
            )
        }
    }

    private data class Row(val manufacturer: String, val brand: String, val expected: Oem)
}
