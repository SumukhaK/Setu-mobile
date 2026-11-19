# Builder prompt · AT-04 · Battery and OEM readiness

You are the builder for one ticket in `SumukhaK/Setu-mobile`. Do this ticket only, open one PR, then stop.

## 0. Read first (in this order, nothing else)

1. `docs/CODEBASE_MEMORY.md` (interfaces, AD-1 to AD-13; AD-13 is new for this ticket).
2. `docs/TDD_TICKETS.md` §6 "AT-04".
3. Setu-Desktop `docs/JOURNEYS.md` section J2, row "Battery and OEM policies", and acceptance row P04: https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md
4. `docs/SCREENS.md` row A05 (consumes this in AT-05; not built here).
5. The existing `:core:readiness` sources, especially `Readiness.kt`, `ReadinessTest.kt`, `NotificationCheck.kt` and `src/main/AndroidManifest.xml`.

## 1. Goal

Extend `:core:readiness` with a battery-optimization check, a vendor (OEM) family detector and a resolver that lists the settings screens the guided setup (AT-05) can open. Add a `BATTERY` step to the readiness report. No UI, no navigation, no ViewModels, and nothing is launched in this ticket.

## 2. Files (create or change only these)

```
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/BatteryCheck.kt          new
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/oem/Oem.kt               new
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/oem/OemIntents.kt        new
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/Readiness.kt             change: Step.BATTERY + DeviceChecks
core/readiness/src/main/AndroidManifest.xml                                            change: <queries>
core/readiness/src/test/kotlin/dev/setu/mobile/core/readiness/BatteryCheckTest.kt      new
core/readiness/src/test/kotlin/dev/setu/mobile/core/readiness/oem/OemTest.kt           new
core/readiness/src/test/kotlin/dev/setu/mobile/core/readiness/oem/OemIntentsTest.kt    new
core/readiness/src/test/kotlin/dev/setu/mobile/core/readiness/ReadinessTest.kt         change: pass battery, add BATTERY cases
```

No new Gradle dependencies. Don't touch `:app`, `:core:setu`, `docs/` or the prototype.

## 3. Contract to implement (decided by the architect; do not reinterpret)

**`BatteryCheck.kt`.** `class BatteryCheck(context: Context) { fun ignoringOptimizations(): Tri }`: `PowerManager.isIgnoringBatteryOptimizations(context.packageName)` true → YES, false → NO. No permission is needed to read it. Never request the exemption (no `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, no `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission).

**`oem/Oem.kt`.** This is pure:

```kotlin
enum class Oem { XIAOMI, SAMSUNG, COLOROS, OTHER }

fun oemOf(manufacturer: String, brand: String): Oem
```

Match case-insensitively on either string:
- `xiaomi`, `redmi`, `poco` → XIAOMI
- `samsung` → SAMSUNG
- `oppo`, `realme`, `oneplus` → COLOROS
- anything else → OTHER

The platform call site is `oemOf(Build.MANUFACTURER, Build.BRAND)`, done by the caller (AT-05). Don't read `Build` inside `oemOf`.

**`oem/OemIntents.kt`.**

```kotlin
enum class Purpose { AUTOSTART, BATTERY, APP_DETAILS }
data class SettingsDestination(val purpose: Purpose, val intent: Intent, val vendorSpecific: Boolean)

class OemIntents(private val context: Context) {
    fun destinations(oem: Oem): List<SettingsDestination>
}
```

Build the list in this order and keep only entries whose `intent.resolveActivity(packageManager) != null`, except the last one:
1. Vendor candidates for `oem` (`vendorSpecific = true`), as explicit components:
   - XIAOMI:
     - AUTOSTART `com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity`
     - BATTERY `com.miui.powerkeeper/com.miui.powerkeeper.ui.HiddenAppsConfigActivity` with extras `package_name` = own package and `package_label` = the app label
   - SAMSUNG:
     - BATTERY `com.samsung.android.lool/com.samsung.android.sm.battery.ui.BatteryActivity`
     - BATTERY `com.samsung.android.lool/com.samsung.android.sm.ui.battery.BatteryActivity`
   - COLOROS:
     - AUTOSTART `com.coloros.safecenter/com.coloros.safecenter.permission.startup.StartupAppListActivity`
     - AUTOSTART `com.coloros.safecenter/com.coloros.safecenter.startupapp.StartupAppListActivity`
     - AUTOSTART `com.oppo.safe/com.oppo.safe.permission.startup.StartupAppListActivity`
   - OTHER: none.
2. System battery list: `Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`, BATTERY, `vendorSpecific = false`.
3. App details, which is always present, never resolve-filtered and always last: `Settings.ACTION_APPLICATION_DETAILS_SETTINGS` with `Uri.fromParts("package", packageName, null)`, APP_DETAILS, `vendorSpecific = false`.

The vendor component names are best effort. Resolution is the safety net, so an unknown ROM simply drops them. Keep the candidate table a private `val`/`when` in the file; no config files and no reflection.

**`AndroidManifest.xml`.** Package visibility (API 30+) hides other apps from `resolveActivity` unless declared. Add one `<queries>` block with:
- `<package>` entries for `com.miui.securitycenter`, `com.miui.powerkeeper`, `com.samsung.android.lool`, `com.coloros.safecenter` and `com.oppo.safe`
- an `<intent>` for the action `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`

Don't use `QUERY_ALL_PACKAGES`.

**`Readiness.kt`.** Add `BATTERY` to `Step` (append it after `NOTIFICATIONS`, so the order reads DEVELOPER_OPTIONS, WIRELESS_DEBUGGING, USB_TCPIP_ENDPOINT, NOTIFICATIONS, BATTERY, AGENT_REACHES_ADBD). Group the four device checks so the function stays under detekt's `LongParameterList` threshold (6), which data classes are exempt from:

```kotlin
data class DeviceChecks(val developerOptions: Tri, val wirelessDebugging: Tri, val notifications: Tri, val battery: Tri)

fun readiness(path: SetupPath, checks: DeviceChecks, state: ConnectionState): ReadinessReport
```

`DeviceChecks` has no defaults in production code. Both supported paths include `BATTERY`; `Unsupported` stays empty. `BATTERY: NO` counts as NO in `ready`, exactly like `NOTIFICATIONS`. Don't special-case it. The rules in `readiness()` are otherwise unchanged. Don't touch `config/detekt/detekt.yml`.

OEM switches (autostart, Never sleeping apps, MIUI "No restrictions") can't be read, so they are **not** steps (AD-13).

## 4. TDD: write these tests first, see them fail, then implement

Map each test to its acceptance ID in a comment. Use JUnit 4. Use Robolectric (`@Config(sdk = [35])` unless stated) only for platform classes.

- **`OemTest` (pure, P04 OEM):** a table covering:
  - `("Xiaomi","Redmi")`, `("Xiaomi","POCO")` and `("XIAOMI","xiaomi")` → XIAOMI
  - `("samsung","samsung")` → SAMSUNG
  - `("OPPO","OPPO")`, `("realme","realme")` and `("OnePlus","OnePlus")` → COLOROS
  - `("Google","google")` → OTHER
  - `("unknown","redmi")` → XIAOMI (the brand alone is enough)
- **`BatteryCheckTest` (Robolectric):** use `shadowOf(powerManager).setIgnoringBatteryOptimizations(packageName, true/false)` and check true → YES and false → NO.
- **`OemIntentsTest` (Robolectric, P04 OEM):**
  - **OTHER with nothing registered:** the list is exactly `[APP_DETAILS]`, and its data URI is `package:<own package>`.
  - **XIAOMI with both MIUI components registered** (`shadowOf(packageManager).addActivityIfNotPresent(component)`, plus an intent filter or resolve info if Robolectric needs it to resolve an explicit component): the list starts with the AUTOSTART then the BATTERY vendor entries, then `APP_DETAILS` last. Check that the BATTERY entry carries `package_name`.
  - **XIAOMI with nothing registered:** the vendor entries are dropped and only `APP_DETAILS` remains.
  - **SAMSUNG with only the second BatteryActivity registered:** exactly that one vendor entry appears.
  - **System battery settings resolvable** (register an activity for the action): it appears with `vendorSpecific = false`, before `APP_DETAILS`.
- **`ReadinessTest` (pure):**
  - Update existing calls to build `DeviceChecks` (a test-only helper with `battery = Tri.YES` is fine) so their assertions are unchanged.
  - Add these cases: both paths contain `BATTERY`; `battery = NO` gives `ready == false`; `battery = UNKNOWN` with everything else YES or UNKNOWN gives `ready == true`; `Unsupported` stays empty.

If Robolectric cannot make an explicit component resolve after you register it, stop and report the exact behaviour in the PR. Don't change the production rule to suit the test.

## 5. Gates (all must pass before you push)

```
./gradlew testDebugUnitTest detekt lint
./gradlew :app:assembleDebug
```

Use no `@Suppress`, no baselines, and disable no new lint checks (AD-8). If lint objects to `<queries>` or a component string, stop and report the exact error.

## 6. Architecture and Karpathy pillars (enforced at review)

- **Clean Architecture and SOLID.** `oemOf` and `readiness` are pure domain functions. `BatteryCheck` and `OemIntents` are thin data sources that take `Context`. `OemIntents` builds and filters intents but never calls `startActivity`. AT-05 launches them.
1. **Think before coding.** The PR description opens with `## Assumptions & Trade-offs`. If J2, P04, this prompt and the platform disagree, stop and ask.
2. **Simplicity first.** Write the minimum code: no DI, no Flows, no caching, no OEM settings reads, no MIUI sheet (AT-05), no "tester confirmed" state (AT-05). Keep files under ~250–300 lines; most should be under 80.
3. **Surgical changes.** Touch only the files in §2. Branch from latest `main` as `feature/AT-04-battery-oem-readiness`. Make atomic conventional commits (`test(android): …` red first, then `feat(android): …`).
4. **Goal-driven TDD.** Commit the failing tests first, then the implementation. Paste the exact gate output in the PR.

## 7. PR and hard stop

Open one PR against `main` titled `feat(android): AT-04 battery and OEM readiness`, with this body:

```
Ticket: AT-04 (docs/TDD_TICKETS.md §6) · Acceptance: P04 (OEM and battery readiness)

## Assumptions & Trade-offs
- …

## What changed
- one line per file

## Test evidence
<red run excerpt>
<full green output of ./gradlew testDebugUnitTest detekt lint and :app:assembleDebug>

## Out of scope (left for later tickets)
- setup UI, MIUI install sheet, tester-confirmed OEM switches, launching destinations, RecheckOnResume wiring (AT-05); EMM source of usbFallbackAllowed (AT-09)
```

Then **stop immediately**. Don't start AT-05, don't edit `docs/`, and don't merge.
