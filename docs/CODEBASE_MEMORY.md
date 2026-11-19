# Setu-mobile · codebase memory

Read this first. It replaces a repo scan. Keep it under 150 lines; update it in every post-merge ritual.

Last updated: 2026-11-19 · main @ `a66a2c9` (AT-04 merged, AT-05 prompt issued) · SDK baseline: Setu-SDK v1.1.0 (`SumukhaK/Setu` tag `v1.1.0`, commit `921aded`)

## Pipeline

- Architect/reviewer: Claude. Builders: one ticket per PR from `docs/TDD_TICKETS.md`, branch from latest `main`.
- Active builder prompt: `docs/prompts/CURRENT_TASK.md` (Android ticket). Desktop runs in parallel with its own prompt. Review fixes: `docs/REVIEW_FIX_PROMPT.md`.
- Acceptance tests: Setu-Desktop `docs/JOURNEYS.md` P01–P22 (canonical for both apps). Screens: `docs/SCREENS.md` here.
- SDK contract: https://github.com/SumukhaK/Setu/blob/v1.1.0/API_SPEC.md (§4 Android SDK, §4.4 notifications, §1.5 events).

## Stack and gates

- Kotlin 2.1.21, AGP 8.9.3, Gradle 8.14.3, JVM 17, compileSdk/targetSdk 35, minSdk 29, Compose BOM 2025.05.01, detekt 1.23.8 (generated `config/detekt/detekt.yml`).
- Layers: `ui` (Compose + ViewModel, `StateFlow` UDF) → `domain/usecase` → `data/repository` (`SetuHost`) → SDK. Only create a layer when a ticket needs it.
- Gates: `./gradlew testDebugUnitTest detekt lint` and `./gradlew :app:assembleDebug`. Lint `warningsAsErrors` + `abortOnError`.
- Tests: JUnit 4, Robolectric 4.15.1 (`@Config(sdk = [35])`), Turbine, coroutines-test. No CI yet; the builder pastes gate output into the PR.
- The Android SDK can't be downloaded in Claude's cloud session, so the reviewer relies on the builder's pasted gate output and reads the code.

## Directory map

```
settings.gradle.kts build.gradle.kts gradle.properties gradle/libs.versions.toml   build (detekt on all subprojects)
config/detekt/detekt.yml        generated defaults
third_party/setu-android/       vendored setu-android-1.1.0.aar + README (sha256 c5d3b368…cf94c)
app/                            :app, namespace dev.setu.mobile
  src/main/kotlin/dev/setu/mobile/MainActivity.kt   placeholder Compose screen ("Setu")
  src/main/kotlin/dev/setu/mobile/service/HostingService.kt       FGS (specialUse), owns SDK lifecycle
  src/main/kotlin/dev/setu/mobile/service/HostingNotification.kt  publicText-only, VISIBILITY_SECRET
  src/main/res/values/strings.xml                                 channel name, FGS subtype
  src/test/.../service/FakeSetuHost.kt, HostingServiceTest.kt, HostingNotificationTest.kt
  src/main/res/xml/             backup_rules, data_extraction_rules (exclude everything)
  src/test/.../MainActivityTest.kt                  P01 UI (Robolectric)
core/setu/                      :core:setu, namespace dev.setu.mobile.core.setu
  src/main/.../SetuHost.kt, SetuManagerHost.kt      SDK seam
  src/test/.../FakeAgentLauncher.kt, FakePolicyProvider.kt, SetuManagerHostTest.kt
core/readiness/                 :core:readiness, namespace dev.setu.mobile.core.readiness (deps :core:setu; :app not wired until AT-05)
  src/main/.../SetupPath.kt, SetupPathDetector.kt (+NetworkReader), Readiness.kt   pure domain
  src/main/.../DeveloperOptionsCheck.kt, WirelessDebuggingCheck.kt, NotificationCheck.kt, RecheckOnResume.kt
  src/main/.../BatteryCheck.kt, oem/Oem.kt, oem/OemIntents.kt                    AT-04
  src/main/AndroidManifest.xml  ACCESS_NETWORK_STATE, <queries> (5 vendor packages + battery settings action)
index.html prototype.*          browser wireframe prototype (not app code)
docs/                           SCREENS, TDD_TICKETS (AT tracker), CODEBASE_MEMORY, prompts/
```

## Key public interfaces

- `dev.setu.mobile.core.setu.SetuHost`: `connectionState: StateFlow<ConnectionState>`, `policyStatus: StateFlow<PolicyStatus>`, `sessions: StateFlow<List<DeviceSession>>`, `start(config: SetuConfig? = null)` (null reuses the last config), `stop()`, `refreshPolicy(): PolicyStatus`.
- `dev.setu.mobile.service.HostingService` (open): `HostingService.start(context, relayUrl)`, `HostingService.stop(context)`, `EXTRA_RELAY_URL`. `protected open fun createHost(): SetuHost` is the only `SetuManager.initialize` call. Restrictions broadcast → `refreshPolicy()` + `start(null)`. `NotConfigured` → `stopSelf()`. `START_NOT_STICKY`.
- `HostingNotification.build(context, NotificationContent)`, `ensureChannel(context)`, `NOTIFICATION_ID = 1`, `CHANNEL_ID = "hosting"`.
- App test double: `FakeSetuHost` (MutableStateFlows, `calls`, `starts`, `stopCount`, `startError`). Service tests subclass `HostingService` and override `createHost()`.
- `SetuManagerHost(manager: SetuManager) : SetuHost`: delegation only.
- Readiness (AT-03, pure): `enum Tri { YES, NO, UNKNOWN }`; `SetupPath` = `WirelessDebugging | UsbTcpip | Unsupported(Reason.USB_FALLBACK_FORBIDDEN)`; `detectSetupPath(sdkInt, onWifi, usbFallbackAllowed)`; `readiness(path, checks: DeviceChecks(developerOptions, wirelessDebugging, notifications, battery), state): ReadinessReport(path, steps: Map<Step, Tri>)` with `ready` = supported path and no step NO. `Step` = DEVELOPER_OPTIONS, WIRELESS_DEBUGGING, USB_TCPIP_ENDPOINT, NOTIFICATIONS, BATTERY, AGENT_REACHES_ADBD.
- SDK evidence rules: `adbd_unreachable` warning → NO (wins over any endpoint); endpoint → YES; Online without either → UNKNOWN; non-Online → UNKNOWN. USB step YES only for `127.0.0.1:5555`. Agent YES overrides the wireless setting.
- Readers (thin, Context-taking): `NetworkReader.onWifi()`, `DeveloperOptionsCheck.enabled()` (missing → NO), `WirelessDebuggingCheck.enabled()` (`adb_wifi_enabled`, UNKNOWN if missing or < API 30), `NotificationCheck.granted()`, `BatteryCheck.ignoringOptimizations()`. `RecheckOnResume(onRecheck): DefaultLifecycleObserver`.
- OEM (AT-04): `oemOf(manufacturer, brand): Oem` (XIAOMI, SAMSUNG, COLOROS, OTHER; pure). `OemIntents(context).destinations(oem): List<SettingsDestination(purpose: AUTOSTART|BATTERY|APP_DETAILS, intent, vendorSpecific)>`: resolvable vendor entries, then system battery list if resolvable, then app details (always). Filters with `queryIntentActivities(MATCH_DEFAULT_ONLY)` because Robolectric's `resolveActivity` resolves any explicit component.
- Test seam (core/setu test source set): `FakeAgentLauncher` (`awaitLaunch()`, `launches`, `launchCount`), `FakeAgentProcess` (`emit(json)`, `exit(code)`, `destroyed`), `FakePolicyProvider(policy)`. Real manager: `SetuManager.Builder(ctx).agentLauncher().policyProvider().networkInfoProvider { emptyList() }.stateDir(tmp).scope(realScope).build()`.

## Wired SDK v1.1.0 bindings

| SDK API | Wired in | Ticket |
| --- | --- | --- |
| `SetuManager.Builder(...)` injection points | `SetuManagerHostTest` | AT-01 |
| `connectionState`, `policyStatus`, `start(config)`, `stop()` | `SetuManagerHost` | AT-01 |
| `sessions`, `refreshPolicy()`, `start(null)` | `SetuManagerHost`, `HostingService` | AT-02 |
| `SetuManager.initialize`, `SetuNotifications.content(...).publicText` | `HostingService`, `HostingNotification` | AT-02 |
| `ACTION_APPLICATION_RESTRICTIONS_CHANGED` | `HostingService` receiver | AT-02 |
| `ConnectionState.Online.adbdEndpoint`, `.warning` (`adbd_unreachable`) | `readiness()` | AT-03 |

The SDK's permissions (INTERNET, network/wifi state, multicast) come in through the AAR manifest merge.

## Architecture decisions (binding on builders)

- AD-1: `HostingService` (AT-02) is the only caller of `SetuManager.initialize`, `start`, `stop` and `refreshPolicy`.
- AD-2: Notifications use `SetuNotifications.content(...).publicText` for both the private and public versions, with `VISIBILITY_SECRET`; `text` is never posted (P06, TDD_TICKETS §2.6).
- AD-3: `peer_label` is shown as "Computer name (unverified)" until the SDK exposes a verified subject (P22).
- AD-4: Never cache the unscoped corporate policy JSON (P07).
- AD-5: The SDK is vendored (not on Maven) and consumed with `api(files(...))` plus an explicit `kotlinx-coroutines-android` 1.10.2. Checksum verified against the v1.1.0 release asset.
- AD-6: applicationId and namespace `dev.setu.mobile`; modules `dev.setu.mobile.core.<name>`, `dev.setu.mobile.feature.<name>`.
- AD-7: `SetuHost` is the only seam to the SDK and exposes SDK model types directly. Add domain models and mappers only when a feature needs them.
- AD-8: Toolchain matches the SDK. No detekt or lint baselines and no `@Suppress`. Lint's version-currency checks `GradleDependency`, `AndroidGradlePluginVersion` and `OldTargetApi` are disabled per module, because the pinned toolchain would otherwise fail every build (ratified in the AT-01 review). No other lint check may be disabled.
- AD-9: Composables are written inline or as named `@Composable` functions with detekt's `FunctionNaming` configured for Compose (`ignoreAnnotated: ['Composable']`) once the first named composable is needed. AT-01 used inline content only.
- AD-10 (AT-02): App tests that need SDK state use a `FakeSetuHost` (MutableStateFlows) in `app/src/test`. Only `:core:setu` tests run the real SDK with the fake agent.
- AD-11 (AT-02): `startForeground(..., ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST)`, not `..._SPECIAL_USE` (API 34 constant trips lint at minSdk 29). The manifest declares `specialUse`, so behaviour is identical.
- AD-12 (AT-03): No SDK or policy field controls the USB fallback. Readiness takes `usbFallbackAllowed: Boolean` as an input (default true). AT-09 supplies it from an app EMM restriction (`allow_usb_fallback`, default true).
- AD-13 (AT-04): `:core:readiness` has no UI. The MIUI install-recovery sheet moves to AT-05; AT-04 only detects `Oem.XIAOMI`. OEM switches (autostart, Never sleeping apps) can't be read, so they are not readiness steps: AT-05 shows them as guidance only (no confirm state). Only `Step.BATTERY` (from `isIgnoringBatteryOptimizations`) joins the report; the device checks travel as `DeviceChecks(developerOptions, wirelessDebugging, notifications, battery)` because detekt `LongParameterList` fires at 6 params. Vendor intents are offered only when they resolve; app details is always the last fallback. Never use `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
- AD-14 (AT-05): Feature modules are `:feature:<name>` with a stateless `XContent(state, actions)` composable plus a thin stateful `XScreen`. ViewModels are built with `viewModel { }` initializers (no DI) and take their inputs as constructor params: `SetupViewModel` gets a `DeviceProbe`, `usbFallbackAllowed` and a `StateFlow<ConnectionState>`. Until AT-06 exposes the live hosting state, `MainActivity` passes a constant `Idle` flow, so SDK steps show UNKNOWN in the app.

## Completed tickets

| Ticket | PR | Summary |
| --- | --- | --- |
| AT-01 | [#4](https://github.com/SumukhaK/Setu-mobile/pull/4) | Gradle scaffold, vendored SDK 1.1.0, `SetuHost` seam, fake agent, P01 domain + UI tests |
| AT-02 | [#6](https://github.com/SumukhaK/Setu-mobile/pull/6) | HostingService + lock-screen-safe notification, EMM receiver, P06/P17 tests (14 tests total) |
| AT-03 | [#8](https://github.com/SumukhaK/Setu-mobile/pull/8) | `:core:readiness`: P04 branch table, readiness report from SDK evidence, platform checks (23 tests; 1 review round on the USB endpoint rule) |
| AT-04 | [#12](https://github.com/SumukhaK/Setu-mobile/pull/12) | Battery check, OEM family + resolvable settings destinations, `Step.BATTERY` via `DeviceChecks` |

## Open items

- Active ticket: AT-05 · Guided setup UI (prompt issued 2026-11-19).
- Relay URL for solo: a service start extra with no persistence (AT-02). Settings storage arrives in AT-10. Managed `relay_url` takes precedence (SDK).
- Merged branches `feature/AT-01-scaffold-sdk-seam`, `feature/AT-02-hosting-service` `feature/AT-03-readiness-engine` and `feature/AT-04-battery-oem-readiness` couldn't be deleted from Claude's session. Delete them on GitHub, or turn on "Automatically delete head branches".
- SDK v1.1.1 asks: TDD_TICKETS.md §7 (peer_user/peer_fingerprint, solo trustedDesktops/revokeDesktop).
- Device lab gate (§7) before default-on Android 11+ pairing.
- `HostingNotificationTest` uses deprecated `Bundle.get` (compile warning only). Replace when that file is next touched.
- `NetworkReaderTest` uses deprecated `NetworkInfo` shadows (compile warnings only). Leave unless the file is touched.
