# Builder prompt · AT-03 · Readiness engine

You are the builder for one ticket in `SumukhaK/Setu-mobile`. Do this ticket only, open one PR, then stop.

## 0. Read first (in this order, nothing else)

1. `docs/CODEBASE_MEMORY.md` (interfaces, AD-1 to AD-12; AD-12 is new for this ticket).
2. `docs/TDD_TICKETS.md` §6 "AT-03".
3. Setu-Desktop `docs/JOURNEYS.md` section J2 ("Prepare the phone") and row P04: https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md
4. `docs/SCREENS.md` rows A02, A03 and A04 (which screens will consume this, not built here).
5. Setu-SDK v1.1.0 `API_SPEC.md` §4.2 (`ConnectionState.Online.adbdEndpoint`, `warning`; `SetuConfig.adbd`) and §1.5 (`adbd_unreachable`): https://github.com/SumukhaK/Setu/blob/v1.1.0/API_SPEC.md

## 1. Goal

Add a new `:core:readiness` module that decides the phone's setup path and reports which readiness steps are done, so the guided setup UI (AT-05) can render it later. Most of it is pure Kotlin. Platform reads (API level, Wi-Fi, Developer options, Wireless debugging, notifications) are thin and replaceable in tests. No UI, no navigation and no ViewModels are in this ticket.

## 2. Files (create or change only these)

```
settings.gradle.kts                              include(":core:readiness")
core/readiness/build.gradle.kts                  android library, namespace dev.setu.mobile.core.readiness; deps: project(":core:setu"), androidx-core-ktx, lifecycle-common (for RecheckOnResume)
gradle/libs.versions.toml                        add androidx-lifecycle-common only if not present
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/SetupPath.kt
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/SetupPathDetector.kt
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/DeveloperOptionsCheck.kt
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/WirelessDebuggingCheck.kt
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/NotificationCheck.kt
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/Readiness.kt
core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/RecheckOnResume.kt
core/readiness/src/test/kotlin/dev/setu/mobile/core/readiness/...Test.kt   one test file per main file where it has logic
```

The module copies the lint block (including the three AD-8 version checks) and the JVM 17 settings from `core/setu/build.gradle.kts`. Detekt is applied by the root build.

## 3. Contract to implement (decided by the architect; do not reinterpret)

**Types (`SetupPath.kt`).**

```kotlin
enum class Tri { YES, NO, UNKNOWN }

sealed interface SetupPath {
    data object WirelessDebugging : SetupPath                 // Android 11+ on Wi-Fi
    data object UsbTcpip : SetupPath                          // Android 10, or any version without Wi-Fi, when allowed
    data class Unsupported(val reason: Reason) : SetupPath
    enum class Reason { USB_FALLBACK_FORBIDDEN }
}
```

**Detector (`SetupPathDetector.kt`).** The decision is a pure function, plus one platform reader:
- `fun detectSetupPath(sdkInt: Int, onWifi: Boolean, usbFallbackAllowed: Boolean): SetupPath`:
  - If `sdkInt >= 30 && onWifi`, return `WirelessDebugging`. `usbFallbackAllowed` doesn't matter here.
  - Otherwise, return `UsbTcpip` if `usbFallbackAllowed`, else `Unsupported(USB_FALLBACK_FORBIDDEN)`. The UI later says "contact IT or use supported Wi-Fi".
- `class NetworkReader(context: Context) { fun onWifi(): Boolean }` reads `ConnectivityManager.getNetworkCapabilities(activeNetwork)?.hasTransport(TRANSPORT_WIFI) == true`. No callbacks or listeners: AT-05 re-reads on resume.
- AD-12: `usbFallbackAllowed` is a parameter, and nothing in this ticket reads EMM restrictions.

**Checks (each a small class taking `Context`, with one function returning `Tri`).**
- `DeveloperOptionsCheck.enabled()`: `Settings.Global.DEVELOPMENT_SETTINGS_ENABLED == 1` → YES, `0` → NO. If the setting is missing (`SettingNotFoundException`), return NO.
- `WirelessDebuggingCheck.enabled()` is best effort. Read `Settings.Global` key `"adb_wifi_enabled"` (hidden on API 30+, but readable): 1 → YES, 0 → NO. If it's missing, or on API < 30, return UNKNOWN. Never throw.
- `NotificationCheck.granted()`: on API 33+, `checkSelfPermission(POST_NOTIFICATIONS) == GRANTED` → YES, else NO. Below 33, use `NotificationManagerCompat.areNotificationsEnabled()`.

**Readiness (`Readiness.kt`).** This is a pure function with no Android types except SDK models:

```kotlin
enum class Step { DEVELOPER_OPTIONS, WIRELESS_DEBUGGING, USB_TCPIP_ENDPOINT, NOTIFICATIONS, AGENT_REACHES_ADBD }

data class ReadinessReport(val path: SetupPath, val steps: Map<Step, Tri>) {
    val ready: Boolean get() = path !is SetupPath.Unsupported && steps.values.none { it == Tri.NO }
}

fun readiness(
    path: SetupPath,
    developerOptions: Tri,
    wirelessDebugging: Tri,
    notifications: Tri,
    state: ConnectionState,
): ReadinessReport
```

Rules (J2):
- `WirelessDebugging` path steps: `DEVELOPER_OPTIONS`, `WIRELESS_DEBUGGING`, `NOTIFICATIONS`, `AGENT_REACHES_ADBD`.
- `UsbTcpip` path steps: `DEVELOPER_OPTIONS`, `USB_TCPIP_ENDPOINT`, `NOTIFICATIONS`, `AGENT_REACHES_ADBD`.
- `Unsupported`: steps are empty.
- `AGENT_REACHES_ADBD` comes only from the SDK. `Online` with `adbdEndpoint != null` gives YES. `Online` whose `warning` contains `"adbd_unreachable"` gives NO. Any other state gives UNKNOWN.
- SDK evidence wins over the best-effort setting. When `AGENT_REACHES_ADBD == YES` on the Wireless path, `WIRELESS_DEBUGGING` is YES even if the setting read NO or UNKNOWN.
- `USB_TCPIP_ENDPOINT` is YES only when `Online.adbdEndpoint == "127.0.0.1:5555"`. `Online` with another endpoint or the `adbd_unreachable` warning gives NO. Any other state gives UNKNOWN.
- `NOTIFICATIONS: NO` doesn't block hosting (P06), but it still counts as NO in `ready`. AT-05 decides how to present it. Don't special-case it here.

**`RecheckOnResume.kt`.** `class RecheckOnResume(private val onRecheck: () -> Unit) : DefaultLifecycleObserver` calls `onRecheck()` in `onResume`. Nothing else: AT-05 attaches it.

## 4. TDD: write these tests first, see them fail, then implement

Map each test to its acceptance ID in a comment. Use JUnit 4. Use Robolectric (`@Config(sdk = [...])`) only for the platform readers.

- **P04 branch table (pure):** check `detectSetupPath` for every row, in a parameterised or table-driven test:

  | sdkInt | onWifi | usbAllowed | expected |
  | --- | --- | --- | --- |
  | 29 | true | true | UsbTcpip |
  | 30 | true | true | WirelessDebugging |
  | 35 | false | true | UsbTcpip |
  | 35 | true | false | WirelessDebugging |
  | 29 | true | false | Unsupported(USB_FALLBACK_FORBIDDEN) |
  | 35 | false | false | Unsupported(USB_FALLBACK_FORBIDDEN) |

- **P04 readiness (pure):** the Wireless path shows the right step set. SDK `Online(adbdEndpoint="192.168.1.5:37001")` overrides a NO wireless setting to YES. `Online(warning="adbd_unreachable: …")` gives `AGENT_REACHES_ADBD = NO` and `ready == false`. The USB path with `Online(adbdEndpoint="127.0.0.1:5555")` makes `USB_TCPIP_ENDPOINT` YES, while `"127.0.0.1:5556"` gives NO. With `Idle`, the SDK steps are UNKNOWN and `ready == true` only if nothing is NO. `Unsupported` is never ready.
- **Platform readers (Robolectric):**
  - `DeveloperOptionsCheck` returns 1 → YES, 0 → NO and missing → NO (use `Settings.Global.putInt` in the test).
  - `WirelessDebuggingCheck` returns YES/NO from the key on sdk 35, UNKNOWN when missing, and UNKNOWN on sdk 29.
  - `NotificationCheck` on sdk 33 returns YES/NO via the shadow app's grant/deny.
  - `NetworkReader.onWifi()` returns true for a Wi-Fi active network and false for cellular (use `ShadowNetworkCapabilities` / `ShadowConnectivityManager`).
- **RecheckOnResume:** with a `TestLifecycleOwner` or a `LifecycleRegistry` moved to RESUMED twice (pause in between), `onRecheck` runs twice.

## 5. Gates (all must pass before you push)

```
./gradlew testDebugUnitTest detekt lint
./gradlew :app:assembleDebug
```

Use no `@Suppress`, no baselines, and disable no new lint checks (AD-8). Reading the hidden `adb_wifi_enabled` key by its string name must not need a suppression. If lint objects, stop and report the exact error.

## 6. Architecture and Karpathy pillars (enforced at review)

- **Clean Architecture and SOLID.** `detectSetupPath` and `readiness` are pure domain functions with no `Context`. The checks and `NetworkReader` are thin data sources. `:core:readiness` depends on `:core:setu` only for SDK model types. `:app` doesn't depend on `:core:readiness` yet: AT-05 adds that.
1. **Think before coding.** The PR description opens with `## Assumptions & Trade-offs`. If J2, P04, this prompt and the SDK disagree, stop and ask.
2. **Simplicity first.** Write the minimum code: no Flows or callbacks for network changes, no ViewModel, no DI, no OEM or battery checks (AT-04), no intents to open Settings (AT-05), no caching. Keep files under ~250–300 lines; most should be under 60.
3. **Surgical changes.** Touch only the files in §2. Don't edit `:app`, `:core:setu`, `docs/` or the prototype. Branch from latest `main` as `feature/AT-03-readiness-engine`. Make atomic conventional commits (`test(android): …` red first, then `feat(android): …`).
4. **Goal-driven TDD.** Commit the failing tests first, then the implementation. Paste the exact gate output in the PR.

## 7. PR and hard stop

Open one PR against `main` titled `feat(android): AT-03 readiness engine`, with this body:

```
Ticket: AT-03 (docs/TDD_TICKETS.md §6) · Acceptance: P04 (branch selection and readiness)

## Assumptions & Trade-offs
- …

## What changed
- one line per file

## Test evidence
<red run excerpt>
<full green output of ./gradlew testDebugUnitTest detekt lint and :app:assembleDebug>

## Out of scope (left for later tickets)
- battery/OEM/MIUI (AT-04), setup UI, Settings intents and attaching RecheckOnResume (AT-05), EMM source of usbFallbackAllowed (AT-09)
```

Then **stop immediately**. Don't start AT-04, don't edit `docs/`, and don't merge.
