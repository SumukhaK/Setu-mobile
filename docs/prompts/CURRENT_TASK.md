# Builder prompt · AT-05 · Guided setup UI

You are the builder for one ticket in `SumukhaK/Setu-mobile`. Do this ticket only, open one PR, then stop.

## 0. Read first (in this order, nothing else)

1. `docs/CODEBASE_MEMORY.md` (interfaces, AD-1 to AD-14; AD-14 is new for this ticket, and AD-9 applies now).
2. `docs/TDD_TICKETS.md` §6 "AT-05".
3. `docs/SCREENS.md` rows A02 to A05 and the ASCII layout at the top.
4. Setu-Desktop `docs/JOURNEYS.md` section J2 and rows P04 and P05: https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md
5. The `:core:readiness` public API (`detectSetupPath`, `readiness`, `DeviceChecks`, the readers, `oemOf`, `OemIntents`, `RecheckOnResume`) and `app/src/main/kotlin/dev/setu/mobile/MainActivity.kt` with its test.

## 1. Goal

Add a `:feature:setup` module with the guided setup screen. It shows the detected path, each readiness step with its state and one action, and rechecks when the user returns from Settings. `MainActivity` shows it under the existing "Setu" title. No hosting controls, no navigation library, no persistence and no DI.

## 2. Files (create or change only these)

```
settings.gradle.kts                    include(":feature:setup")
gradle/libs.versions.toml              add androidx-lifecycle-viewmodel-compose and androidx-lifecycle-runtime-compose (version.ref androidxLifecycle); kotlinx-coroutines-test and turbine already exist
config/detekt/detekt.yml               FunctionNaming: ignoreAnnotated: ['Composable']  (AD-9; this one key only)
feature/setup/build.gradle.kts         android library + kotlin.compose plugin, namespace dev.setu.mobile.feature.setup; deps: :core:readiness, :core:setu, compose bom, ui, material3, activity-compose, lifecycle-viewmodel-compose, lifecycle-runtime-compose; copy lint block (incl. the three AD-8 checks), JVM 17 and Robolectric test options from core/readiness
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/DeviceProbe.kt
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/SetupViewModel.kt
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/SetupScreen.kt
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/SettingsIntents.kt
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/MiuiInstallHelp.kt
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/steps/StepRow.kt           shared row: title, state chip, one action
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/steps/UsbBootstrapStep.kt  the USB instructions + unplug gate
feature/setup/src/main/kotlin/dev/setu/mobile/feature/setup/steps/BatteryStep.kt       battery state + OEM destinations
feature/setup/src/main/res/values/strings.xml          every user-visible string
feature/setup/src/test/kotlin/dev/setu/mobile/feature/setup/SetupViewModelTest.kt
feature/setup/src/test/kotlin/dev/setu/mobile/feature/setup/SetupContentTest.kt
feature/setup/src/test/kotlin/dev/setu/mobile/feature/setup/SetupScreenRecheckTest.kt
app/build.gradle.kts                   implementation(project(":feature:setup"))
app/src/main/kotlin/dev/setu/mobile/MainActivity.kt    title "Setu" + SetupScreen below it
```

Developer options, Wireless debugging and Notifications use `StepRow` directly inside `SetupScreen.kt`. Only USB and Battery have enough content for their own files. Don't change `:core:readiness`, `:core:setu`, `HostingService`, `docs/` or the prototype.

## 3. Contract to implement (decided by the architect; do not reinterpret)

**`DeviceProbe.kt`.**

```kotlin
data class DeviceSnapshot(val sdkInt: Int, val onWifi: Boolean, val checks: DeviceChecks, val oem: Oem)

fun interface DeviceProbe { fun read(): DeviceSnapshot }

class AndroidDeviceProbe(private val context: Context) : DeviceProbe
```

`AndroidDeviceProbe.read()` builds the snapshot from:
- `Build.VERSION.SDK_INT`
- `NetworkReader.onWifi()`
- the four checks (`DeveloperOptionsCheck`, `WirelessDebuggingCheck`, `NotificationCheck`, `BatteryCheck`)
- `oemOf(Build.MANUFACTURER, Build.BRAND)`

It has no logic beyond that wiring, so it needs no test.

**`SetupViewModel.kt`.**

```kotlin
data class SetupUiState(val report: ReadinessReport, val oem: Oem, val canUnplugUsb: Boolean)

class SetupViewModel(
    private val probe: DeviceProbe,
    private val usbFallbackAllowed: Boolean,
    connectionState: StateFlow<ConnectionState>,
) : ViewModel() {
    val uiState: StateFlow<SetupUiState>
    fun recheck()
}
```

- The VM holds the latest `DeviceSnapshot` in a `MutableStateFlow`. Read it once in `init`, and again on every `recheck()`.
- `uiState` = `combine(snapshot, connectionState)`, mapped to `SetupUiState`:
  - `report = readiness(detectSetupPath(sdkInt, onWifi, usbFallbackAllowed), snapshot.checks, state)`
  - `oem = snapshot.oem`
  - `canUnplugUsb = report.path == SetupPath.UsbTcpip && report.steps[Step.USB_TCPIP_ENDPOINT] == Tri.YES`
- Use `stateIn(viewModelScope, SharingStarted.Eagerly, <initial computed from the first snapshot and connectionState.value>)`.
- No other logic lives in the VM. `readiness()` owns the rules.

**`SettingsIntents.kt`.** These are plain functions returning `Intent`, with no resolution and no launching:
- `developerOptionsIntent(enabled: Tri)`: `ACTION_APPLICATION_DEVELOPMENT_SETTINGS` when YES, else `ACTION_DEVICE_INFO_SETTINGS`. The step text tells the user to tap Build number seven times.
- `wirelessDebuggingIntent()`: `ACTION_APPLICATION_DEVELOPMENT_SETTINGS`. There is no public deep link to the Wireless debugging page.
- `appNotificationSettingsIntent(packageName)`: `ACTION_APP_NOTIFICATION_SETTINGS` with `EXTRA_APP_PACKAGE`.

**`SetupScreen.kt`.**
- `@Composable fun SetupScreen(viewModel: SetupViewModel)` is the stateful wrapper. It:
  - collects `uiState` with `collectAsStateWithLifecycle()`
  - attaches `RecheckOnResume(viewModel::recheck)` to `LocalLifecycleOwner.current.lifecycle` inside a `DisposableEffect`, removing the observer on dispose
  - builds `OemIntents(context).destinations(state.oem)` with `remember(state.oem)`
  - launches intents with `context.startActivity`
  - on API 33+, when notifications are NO, requests `POST_NOTIFICATIONS` with `rememberLauncherForActivityResult(RequestPermission())`. Below 33 it opens `appNotificationSettingsIntent`.
- `@Composable fun SetupContent(state: SetupUiState, destinations: List<SettingsDestination>, actions: SetupActions)` is stateless and is what tests render. Define `SetupActions` as a small data class of lambdas (`openDeveloperOptions`, `openWirelessDebugging`, `fixNotifications`, `open(SettingsDestination)`).
- Content, top to bottom:
  1. **Path header.** It shows "Wireless debugging (Android 11+ on Wi-Fi)" or "USB setup (Android 10 or no Wi-Fi)". For `Unsupported`, show only the message "This phone can't use the USB fallback here. Contact IT or connect to a supported Wi-Fi network." and nothing else below it.
  2. **One `StepRow` per entry in `report.steps`, in `Step` order.** The chip text is "Done", "Needed" or "Not checked yet" for YES, NO and UNKNOWN.
     - DEVELOPER_OPTIONS: action "Open settings".
     - WIRELESS_DEBUGGING: the text says Android's pairing dialog shows a six-digit code and port that the tester reads to the developer, who enters them on the desktop. The app never asks for that code. Action "Open developer options".
     - USB_TCPIP_ENDPOINT: `UsbBootstrapStep`.
     - NOTIFICATIONS: action "Allow notifications", with the note "Hosting still works without them, but you won't see its status."
     - BATTERY: `BatteryStep`.
     - AGENT_REACHES_ADBD: no action. The text is "Checked once hosting starts."
  3. **`MiuiInstallHelp`**, only when `oem == Oem.XIAOMI`.
- **`UsbBootstrapStep`.** It lists these steps:
  1. Connect USB to a trusted computer.
  2. Allow USB debugging on the phone.
  3. On the computer, run `adb tcpip 5555`.
  4. Keep the cable connected until Setu confirms.

  Below the steps, show "Don't unplug yet: waiting for the phone to report 127.0.0.1:5555." when `!canUnplugUsb`, and "Setup confirmed. You can unplug the USB cable." when it is true. Add a one-line caution: "Use only trusted networks. Don't forward port 5555."
- **`BatteryStep`.** It shows the battery state. It lists one button per destination, labelled by purpose ("Autostart settings", "Battery settings", "App info") and suffixed with "(phone maker)" when `vendorSpecific`. It adds the note "Some phone makers add extra switches we can't check. Turn off restrictions for Setu if you see them." There is no confirm checkbox (AD-13).
- **`MiuiInstallHelp`** is an expandable card titled "Install failed on a Xiaomi phone?". The body says that if installing shows `INSTALL_FAILED_USER_RESTRICTED`, the user should turn on **Install via USB** and **USB debugging (Security settings)** in Developer options where IT allows it. It has an action to open developer options.

**Copy rule.** No string in `feature/setup` may contain "approve", "approved" or "approval": P01's `MainActivityTest` forbids it on the first screen.

**`MainActivity.kt`.** Keep the "Setu" title text and put `SetupScreen` under it. Build the VM with:

```kotlin
viewModel { SetupViewModel(AndroidDeviceProbe(applicationContext), usbFallbackAllowed = true, connectionState = MutableStateFlow(ConnectionState.Idle)) }
```

There are two placeholders, one per later ticket. `usbFallbackAllowed` stays fixed until AT-09 (AD-12). The connection state stays `Idle` until AT-06 (AD-14). Leave a one-line comment on each that names the ticket. Don't add a holder, a singleton or a service change.

## 4. TDD: write these tests first, see them fail, then implement

Map each test to its acceptance ID in a comment. Use JUnit 4, Robolectric `@Config(sdk = [35])` for Compose, and coroutines-test (`runTest`, plus `Dispatchers.setMain` with a test dispatcher) and Turbine for the VM. Use a fake `DeviceProbe` whose snapshot the test can change and that counts reads.

- **`SetupViewModelTest` (P04):**
  - sdk 35 on Wi-Fi gives the Wireless path, with the five Wireless steps in `Step` order.
  - sdk 29 gives the USB path, and `canUnplugUsb == false` while the connection is `Idle`.
  - Emitting `Online(adbdEndpoint = "127.0.0.1:5555")` flips `canUnplugUsb` to true without a recheck.
  - Emitting `"127.0.0.1:5556"` keeps it false.
  - Cellular with `usbFallbackAllowed = false` gives `Unsupported` and an empty step map.
  - `recheck()` re-reads the probe. Change the fake to developer options YES, call `recheck()`, and the step becomes YES.
  - `init` reads the probe exactly once.
- **`SetupContentTest` (Robolectric Compose, `createComposeRule`):**
  - P04: `Unsupported` shows the Contact IT message and no step rows.
  - P04: the USB path with `canUnplugUsb = false` shows "Don't unplug yet", and with true it shows "You can unplug".
  - P04 OEM: XIAOMI shows "Install failed on a Xiaomi phone?", and OTHER doesn't.
  - P04 OEM: with destinations `[vendor BATTERY, APP_DETAILS]`, clicking "Battery settings (phone maker)" calls `open` with that destination.
  - P06: notifications NO shows "Allow notifications" plus the "Hosting still works" note, and clicking it calls `fixNotifications`.
  - P05 (phone half, partial): no node has a set-text action (`onAllNodes(hasSetTextAction()).assertCountEquals(0)`) on either path.
- **`SetupScreenRecheckTest` (P04 recheck on return):**
  1. Use `createAndroidComposeRule<ComponentActivity>()` and set `SetupScreen(vm)` with the fake probe.
  2. Move the activity to CREATED and then back to RESUMED via `activityRule.scenario.moveToState(...)`.
  3. Assert the probe read count increased by at least one more than the initial reads.
- **The existing `MainActivityTest` (P01) must stay green unchanged.**

## 5. Gates (all must pass before you push)

```
./gradlew testDebugUnitTest detekt lint
./gradlew :app:assembleDebug
```

Use no `@Suppress`, no baselines, and disable no new lint checks (AD-8). The only detekt config change allowed is the AD-9 `FunctionNaming` key. If another detekt rule fires on a composable (for example `LongMethod` or `LongParameterList`), split the composable. Don't change the config. If lint objects to anything you can't fix in code, stop and report the exact error.

## 6. Architecture and Karpathy pillars (enforced at review)

- **Clean Architecture and SOLID.** UI (`SetupContent`) → ViewModel (`SetupViewModel`, `StateFlow`, UDF) → domain (`detectSetupPath`, `readiness` from `:core:readiness`) → data (`DeviceProbe` over the readers). The VM has no `Context`. Composables hold no rules: everything that decides YES, NO, UNKNOWN or unplug comes from `SetupUiState`.
1. **Think before coding.** The PR description opens with `## Assumptions & Trade-offs`. If J2, P04, SCREENS A02 to A05, this prompt and the platform disagree, stop and ask.
2. **Simplicity first.** Write the minimum code: no navigation library, no DI, no persistence, no Start hosting button (AT-06), no pairing guide screen (AT-08), no animations, no theming work beyond `MaterialTheme`. Keep files under ~250–300 lines and composables short.
3. **Surgical changes.** Touch only the files in §2. Branch from latest `main` as `feature/AT-05-guided-setup-ui`. Make atomic conventional commits (`test(android): …` red first, then `feat(android): …`).
4. **Goal-driven TDD.** Commit the failing tests first, then the implementation. Paste the exact gate output in the PR.

## 7. PR and hard stop

Open one PR against `main` titled `feat(android): AT-05 guided setup UI`, with this body:

```
Ticket: AT-05 (docs/TDD_TICKETS.md §6) · Acceptance: P04 (guided setup end to end with fakes), P05 phone half (partial), P06 (notification denial copy)

## Assumptions & Trade-offs
- …

## What changed
- one line per file

## Test evidence
<red run excerpt>
<full green output of ./gradlew testDebugUnitTest detekt lint and :app:assembleDebug>

## Out of scope (left for later tickets)
- live ConnectionState and Start hosting (AT-06), system pairing guide (AT-08), EMM usbFallbackAllowed (AT-09), persisted settings (AT-10)
```

Then **stop immediately**. Don't start AT-06, don't edit `docs/`, and don't merge.
