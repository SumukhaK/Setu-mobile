package dev.setu.mobile.core.readiness.oem

enum class Oem { XIAOMI, SAMSUNG, COLOROS, OTHER }

fun oemOf(manufacturer: String, brand: String): Oem = when {
    isXiaomi(manufacturer) || isXiaomi(brand) -> Oem.XIAOMI
    isSamsung(manufacturer) || isSamsung(brand) -> Oem.SAMSUNG
    isColorOs(manufacturer) || isColorOs(brand) -> Oem.COLOROS
    else -> Oem.OTHER
}

private fun isXiaomi(value: String): Boolean = value.matchesAnyOf(XIAOMI_NAMES)

private fun isSamsung(value: String): Boolean = value.matchesAnyOf(SAMSUNG_NAMES)

private fun isColorOs(value: String): Boolean = value.matchesAnyOf(COLOROS_NAMES)

private fun String.matchesAnyOf(names: Set<String>): Boolean = names.any { equals(it, ignoreCase = true) }

private val XIAOMI_NAMES = setOf("xiaomi", "redmi", "poco")
private val SAMSUNG_NAMES = setOf("samsung")
private val COLOROS_NAMES = setOf("oppo", "realme", "oneplus")
