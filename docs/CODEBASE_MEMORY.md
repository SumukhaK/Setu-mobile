# Setu-mobile · codebase memory

Read this first. It replaces a repo scan. Keep it under 150 lines; update it in every post-merge ritual.

Last updated: 2026-11-19 · main @ `fab5dcf` (AT-01 merged, AT-02 prompt issued) · SDK baseline: Setu-SDK v1.1.0 (`SumukhaK/Setu` tag `v1.1.0`, commit `921aded`)

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
  src/main/res/xml/             backup_rules, data_extraction_rules (exclude everything)
  src/test/.../MainActivityTest.kt                  P01 UI (Robolectric)
core/setu/                      :core:setu, namespace dev.setu.mobile.core.setu
  src/main/.../SetuHost.kt, SetuManagerHost.kt      SDK seam
  src/test/.../FakeAgentLauncher.kt, FakePolicyProvider.kt, SetuManagerHostTest.kt
index.html prototype.*          browser wireframe prototype (not app code)
docs/                           SCREENS, TDD_TICKETS (AT tracker), CODEBASE_MEMORY, prompts/
```

## Key public interfaces

- `dev.setu.mobile.core.setu.SetuHost`: `connectionState: StateFlow<ConnectionState>`, `policyStatus: StateFlow<PolicyStatus>`, `start(config: SetuConfig)`, `stop()`. AT-02 extends it with `sessions`, `refreshPolicy()` and `start(config: SetuConfig? = null)`.
- `SetuManagerHost(manager: SetuManager) : SetuHost`: delegation only.
- Test seam (core/setu test source set): `FakeAgentLauncher` (`awaitLaunch()`, `launches`, `launchCount`), `FakeAgentProcess` (`emit(json)`, `exit(code)`, `destroyed`), `FakePolicyProvider(policy)`. Real manager: `SetuManager.Builder(ctx).agentLauncher().policyProvider().networkInfoProvider { emptyList() }.stateDir(tmp).scope(realScope).build()`.

## Wired SDK v1.1.0 bindings

| SDK API | Wired in | Ticket |
| --- | --- | --- |
| `SetuManager.Builder(...)` injection points | `SetuManagerHostTest` | AT-01 |
| `connectionState`, `policyStatus`, `start(config)`, `stop()` | `SetuManagerHost` | AT-01 |

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

## Completed tickets

| Ticket | PR | Summary |
| --- | --- | --- |
| AT-01 | [#4](https://github.com/SumukhaK/Setu-mobile/pull/4) | Gradle scaffold, vendored SDK 1.1.0, `SetuHost` seam, fake agent, P01 domain + UI tests |

## Open items

- Active ticket: AT-02 · Hosting foreground service and notification (prompt issued 2026-11-19).
- Relay URL for solo: AT-02 takes it as a service start extra with no persistence. Settings storage arrives in AT-10. Managed `relay_url` takes precedence (SDK).
- `debugImplementation(ui-test-manifest)` in `:app` is unused by `createAndroidComposeRule<MainActivity>`. Remove it when a ticket next touches `app/build.gradle.kts`.
- Merged branch `feature/AT-01-scaffold-sdk-seam` couldn't be deleted from Claude's session. Delete it on GitHub, or turn on "Automatically delete head branches".
- SDK v1.1.1 asks: TDD_TICKETS.md §7 (peer_user/peer_fingerprint, solo trustedDesktops/revokeDesktop).
- Device lab gate (§7) before default-on Android 11+ pairing.
