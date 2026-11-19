# Builder prompt · AT-01 · Project scaffold and SDK test seam

You are the builder for one ticket in `SumukhaK/Setu-mobile`. Do this ticket only, open one PR, then stop.

## 0. Read first (in this order, nothing else)

1. `docs/CODEBASE_MEMORY.md` (repo map, architecture decisions AD-1 to AD-8).
2. `docs/TDD_TICKETS.md` §4 (stack, Android test seam) and §6 "AT-01".
3. Setu-Desktop `docs/JOURNEYS.md` row P01: https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md
4. Setu-SDK v1.1.0 `API_SPEC.md` §4.1–§4.3: https://github.com/SumukhaK/Setu/blob/v1.1.0/API_SPEC.md
5. The SDK's SPI and its own fake, as the reference for the agent line format: `android/agent-protocol/src/main/kotlin/dev/genadb/sdk/Spi.kt` and `FakeAgent` in `android/agent-protocol/src/test/kotlin/dev/genadb/sdk/SdkTest.kt` (tag `v1.1.0`).

Do not scan the rest of the repo. `index.html` is a wireframe prototype: do not touch it.

## 1. Goal

A buildable Android project with two modules, `:app` and `:core:setu`. It depends on the Setu Android SDK 1.1.0 and puts `SetuManager` behind our own `SetuHost` interface. It also has a test seam that runs the real SDK reducers against scripted agent output. No features, no hosting service, no readiness, no navigation.

## 2. Files (create only these)

```
settings.gradle.kts                    rootProject "setu-mobile"; include(":app", ":core:setu")
build.gradle.kts                       plugins apply false; detekt applied to all modules
gradle.properties                      android.useAndroidX=true, kotlin.code.style=official, jvmargs
gradle/libs.versions.toml              all versions and libraries (see §3)
gradle/wrapper/*  gradlew  gradlew.bat  Gradle wrapper 8.11.1+
config/detekt/detekt.yml               detekt defaults (generate with detektGenerateConfig, do not hand-tune)
third_party/setu-android/setu-android-1.1.0.aar   vendored SDK (AD-5)
third_party/setu-android/README.md     source tag, commit, sha256, how it was built
app/build.gradle.kts                   application, Compose, packaging { jniLibs { useLegacyPackaging = true } }
app/src/main/AndroidManifest.xml
app/src/main/kotlin/dev/setu/mobile/MainActivity.kt      one Compose screen showing "Setu" and nothing else
app/src/test/kotlin/dev/setu/mobile/MainActivityTest.kt   Robolectric P01 UI check
core/setu/build.gradle.kts             android library; api(SDK AAR) + api(coroutines-android)
core/setu/src/main/kotlin/dev/setu/mobile/core/setu/SetuHost.kt          interface
core/setu/src/main/kotlin/dev/setu/mobile/core/setu/SetuManagerHost.kt   implementation wrapping SetuManager
core/setu/src/test/kotlin/dev/setu/mobile/core/setu/FakeAgentLauncher.kt
core/setu/src/test/kotlin/dev/setu/mobile/core/setu/FakePolicyProvider.kt
core/setu/src/test/kotlin/dev/setu/mobile/core/setu/SetuManagerHostTest.kt
.gitignore                             Android/Gradle ignores (create if absent)
```

## 3. Contract to implement (decided by the architect; do not reinterpret)

**Toolchain (match the SDK build).** AGP 8.9.3, Kotlin 2.1.21 with the Compose compiler plugin, JDK/JVM target 17, compileSdk 35, targetSdk 35, minSdk 29. Use the Compose BOM, `kotlinx-coroutines-android` 1.10.2, JUnit 4, `kotlinx-coroutines-test`, Turbine, Robolectric, `androidx.test:core`, and detekt 1.23.8. Android lint is on with `warningsAsErrors = true` and `abortOnError = true`. Put every version in `libs.versions.toml`.

**SDK dependency (AD-5).** The SDK is not on any Maven repo. Vendor the official 1.1.0 AAR at `third_party/setu-android/setu-android-1.1.0.aar` and depend on it from `:core:setu` with `api(files(...))`. A file AAR carries no POM, so also declare `api(libs.kotlinx.coroutines.android)` (1.10.2, as the SDK declares). Build the AAR from `SumukhaK/Setu` tag `v1.1.0` with `cd android && ./gradlew :genadb-android:assembleRelease` (needs Go 1.24+), or take it from the v1.1.0 GitHub release if one is attached. Record the tag, commit `921aded` and the sha256 in the README. If you can't get the AAR, stop and ask. Don't stub the SDK.

**Ids (AD-6).** applicationId and namespace `dev.setu.mobile`; `:core:setu` namespace `dev.setu.mobile.core.setu`.

**`SetuHost` (AD-7).** This is the only seam the rest of the app will use. It exposes SDK model types directly (`ConnectionState`, `PolicyStatus`, `SetuConfig`). Don't add mapper or domain model copies until a feature needs them.

```kotlin
interface SetuHost {
    val connectionState: StateFlow<ConnectionState>
    val policyStatus: StateFlow<PolicyStatus>
    fun start(config: SetuConfig)
    fun stop()
}
```

`SetuManagerHost(private val manager: SetuManager) : SetuHost` only delegates. No logic, no logging. Nothing else in `:core:setu` main.

**Fakes (test source set only).**
- `FakeAgentLauncher : AgentLauncher` records launch args. Each `launch` returns a `FakeAgentProcess` with `emit(json: String)` and `exit(code: Int)`. `readLine` blocks on a queue and returns null after `exit` or `destroy`, and `destroy` must unblock it. Mirror the SDK's own `FakeAgent`: same behaviour, our package.
- `FakePolicyProvider(var policy: ManagedPolicy = ManagedPolicy()) : PolicyProvider`.
- Build the real manager in tests as `SetuManager.Builder(ApplicationProvider.getApplicationContext()).agentLauncher(fake).policyProvider(fakePolicy).networkInfoProvider { emptyList() }.stateDir(tempDir).scope(testScope).build()`. Never mock `SetuManager` (internal constructor, see TDD_TICKETS §4). The SDK reads agent lines on a blocking thread, so use a real-dispatcher scope that you cancel in `@After`, and await flows with Turbine or `withTimeout`. Don't add sleeps.

**What not to call.** Don't call `SetuManager.initialize` or `getInstance`, and don't add a `Service`, permissions, a notification channel, a DI framework, navigation or a theme beyond `MaterialTheme`. AD-1 reserves `initialize`, `start`, `stop` and `refreshPolicy` for `HostingService` (AT-02); here only tests call `start`.

## 4. TDD: write these tests first, see them fail, then implement

Map each test to its acceptance ID in a comment.

- **P01, domain:** with `FakePolicyProvider()` (no managed config), `host.policyStatus.value` is `mode == Mode.SOLO`, `managed == false`, `missing == null`, and `connectionState` starts as `Idle`. Nothing is launched before `start`.
- **Smoke, from the ticket:** after `host.start(SetuConfig(relayUrl = "wss://relay.test/"))`, the fake sees one launch. Then `emit("""{"event":"online","device_id":"dev-1"}""")` and `emit("""{"event":"pairing_code","code":"4321-908172","device_id":"dev-1"}""")`, and `connectionState` reaches `Online(deviceId = "dev-1", pairingCode = "4321-908172", …)`.
- **Stop:** `host.stop()` destroys the fake process, and `connectionState` returns to `Idle`. Take the expected terminal state from the SDK's behaviour; if it differs, write down what you saw in Assumptions.
- **P01, UI (Robolectric, `:app`):** `MainActivity` launches. The screen shows "Setu" and has no node whose text contains "Sign in", "Account", "Approve" or "Email" (case-insensitive).

## 5. Gates (all must pass before you push)

```
./gradlew testDebugUnitTest detekt lint
./gradlew :app:assembleDebug
```

No `@Suppress`, no detekt baseline, no lint baseline. If a gate fails for a reason outside this ticket, such as detekt 1.23.8 refusing Kotlin 2.1.21, stop and report the exact error instead of downgrading or disabling anything.

## 6. Architecture and Karpathy pillars (enforced at review)

- **Clean Architecture and SOLID.** Dependencies point one way: `ui` → `domain/usecase` → `data/repository` (`SetuHost`) → SDK. In AT-01 only the bottom layer exists. Don't create empty `domain` or `ui` packages, use cases or ViewModels. `SetuHost` is a narrow interface (ISP), and the app will depend on it rather than on `SetuManager` (DIP). State is exposed only as `StateFlow` (UDF).
1. **Think before coding.** The PR description opens with `## Assumptions & Trade-offs`. If the ticket, this prompt and `API_SPEC.md` disagree, stop and ask before coding around it.
2. **Simplicity first.** Write the minimum code for this ticket: no speculative modules (`:core:readiness` arrives in AT-03, `:feature:*` later), no base classes, no wrappers beyond `SetuHost`. Keep files under ~250–300 lines.
3. **Surgical changes.** Touch only the files in §2. Don't edit `docs/`, `README.md` or `index.html`. Branch from latest `main` as `feature/AT-01-scaffold-sdk-seam`. Make atomic conventional commits, for example `build(android): add Gradle scaffold and vendored Setu SDK 1.1.0`, `test(android): add SetuHost seam tests with fake agent`, `feat(android): add SetuHost backed by SetuManager`.
4. **Goal-driven TDD.** Commit the failing tests first (red), then the implementation (green). Paste the exact gate output in the PR.

## 7. PR and hard stop

Open one PR against `main` titled `feat(android): AT-01 project scaffold and SDK test seam`, with this body:

```
Ticket: AT-01 (docs/TDD_TICKETS.md §6) · Acceptance: P01 + fake-agent smoke test

## Assumptions & Trade-offs
- …

## What changed
- one line per file or file group

## SDK artifact
- source tag/commit, sha256 of third_party/setu-android/setu-android-1.1.0.aar

## Test evidence
<red run excerpt showing the new tests failing>
<full green output of ./gradlew testDebugUnitTest detekt lint and :app:assembleDebug>

## Out of scope (left for later tickets)
- HostingService and notification (AT-02), readiness (AT-03/04), setup UI (AT-05), hosting screen (AT-06)
```

Then **stop immediately**. Don't start AT-02, don't edit `docs/`, and don't merge.
