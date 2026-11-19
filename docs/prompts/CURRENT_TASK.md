# Builder prompt · AT-06 · Solo hosting screen

You are the builder for one ticket in `SumukhaK/Setu-mobile`. Do this ticket only, open one PR, then stop.

## 0. Read first (in this order, nothing else)

1. `docs/CODEBASE_MEMORY.md` (interfaces, AD-1 to AD-15; AD-15 is new for this ticket, and the copy rule under Open items applies).
2. `docs/TDD_TICKETS.md` §6 "AT-06".
3. `docs/SCREENS.md` row A06 and the ASCII layout ("Prepare ── Host").
4. Setu-Desktop `docs/JOURNEYS.md` rows P03 and P17: https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md
5. Setu-SDK v1.1.0 `API_SPEC.md` §4 (`SetuManager.pair`, `ConnectionState`, `Reconnecting`): https://github.com/SumukhaK/Setu/blob/v1.1.0/API_SPEC.md
6. Existing code: `SetuHost`, `SetuManagerHost`, `HostingService`, `FakeSetuHost`, `MainActivity`, `:feature:setup` (as the module pattern to copy).

## 1. Goal

The phone can start and stop Solo hosting from the app, and it shows the live state, device ID and the agent's current pairing code. The live SDK state also feeds the setup screen, replacing AT-05's `Idle` placeholder. There are no sessions list (AT-07), no recovery screens (AT-08), no managed screens (AT-09) and no settings (AT-10).

## 2. Files (create or change only these)

```
core/setu/src/main/kotlin/dev/setu/mobile/core/setu/SetuHost.kt          + suspend fun pair(timeoutMs: Long = 30_000): String
core/setu/src/main/kotlin/dev/setu/mobile/core/setu/SetuManagerHost.kt   delegate pair()
app/src/test/kotlin/dev/setu/mobile/service/FakeSetuHost.kt              implement pair() (scripted result or error, call count)
app/src/main/kotlin/dev/setu/mobile/service/HostingRegistry.kt           new (AD-15)
app/src/main/kotlin/dev/setu/mobile/service/HostingService.kt            attach after createHost(), detach in onDestroy (2 lines)
app/src/test/kotlin/dev/setu/mobile/service/HostingRegistryTest.kt       new
settings.gradle.kts                                                      include(":feature:host")
gradle/libs.versions.toml                                                add androidx-compose-ui-test-manifest (no version; BOM) and use it in feature/setup too
feature/setup/build.gradle.kts                                           swap the inline ui-test-manifest coordinate for the catalog entry (that one line only)
feature/host/build.gradle.kts                                            copy feature/setup's (namespace dev.setu.mobile.feature.host; deps :core:setu, compose, lifecycle; no :core:readiness)
feature/host/src/main/kotlin/dev/setu/mobile/feature/host/HostViewModel.kt
feature/host/src/main/kotlin/dev/setu/mobile/feature/host/HostScreen.kt
feature/host/src/main/res/values/strings.xml
feature/host/src/test/kotlin/dev/setu/mobile/feature/host/HostViewModelTest.kt
feature/host/src/test/kotlin/dev/setu/mobile/feature/host/HostContentTest.kt
app/build.gradle.kts                                                     buildConfig on; BuildConfig.SETU_RELAY_URL; implementation(project(":feature:host"))
app/src/main/kotlin/dev/setu/mobile/MainActivity.kt                      Prepare / Host tabs; live state into both VMs
```

Don't change `:core:readiness`, the rest of `:feature:setup`, `docs/` or the prototype.

## 3. Contract to implement (decided by the architect; do not reinterpret)

**`SetuHost.pair`.** Add `suspend fun pair(timeoutMs: Long = 30_000): String` and have `SetuManagerHost` delegate to `SetuManager.pair(timeoutMs)`. This is delegation only, so it needs no new `:core:setu` test.

**`HostingRegistry.kt` (AD-15).**

```kotlin
object HostingRegistry {
    val connectionState: StateFlow<ConnectionState>   // attached host's state, else Idle
    suspend fun pair(): String                        // attached host's pair(); IllegalStateException("not hosting") if none
    internal fun attach(host: SetuHost)
    internal fun detach(host: SetuHost)               // no-op unless host is the attached one
}
```

- Back it with `MutableStateFlow<SetuHost?>(null)`. `connectionState` is `flatMapLatest { it?.connectionState ?: flowOf(Idle) }.stateIn(<registry scope>, SharingStarted.Eagerly, Idle)`, with the registry scope being `CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)`.
- `HostingService.onCreate` calls `attach(host)` right after `createHost()`. `onDestroy` calls `detach(host)` after `host.stop()`. Change nothing else in the service.
- Nothing in the UI calls `SetuManager.getInstance` (AD-15).

**`app/build.gradle.kts`.** Add `buildFeatures { buildConfig = true }` and `buildConfigField("String", "SETU_RELAY_URL", "\"${providers.gradleProperty("setu.relayUrl").getOrElse("")}\"")`. Don't add a value to `gradle.properties`: an empty string means "no relay configured in this build".

**`HostViewModel.kt`.**

```kotlin
interface HostingActions {
    fun start()
    fun stop()
    suspend fun pair(): String
}

data class HostUiState(
    val status: HostStatus,
    val deviceId: String?,
    val pairingCode: String?,
    val warning: String?,
    val canStart: Boolean,
    val canStop: Boolean,
    val message: HostMessage?,
)

enum class HostStatus { IDLE, STARTING, ONLINE, RECONNECTING, BLOCKED, POLICY_MISSING }
sealed interface HostMessage {
    data object NoRelay : HostMessage
    data object PairFailed : HostMessage
    data class RetryIn(val seconds: Long) : HostMessage
}

class HostViewModel(
    connectionState: StateFlow<ConnectionState>,
    private val actions: HostingActions,
    private val relayConfigured: Boolean,
) : ViewModel() {
    val uiState: StateFlow<HostUiState>
    fun start()
    fun stop()
    fun newCode()
}
```

Map the SDK state as follows:
- `Idle` → IDLE.
- `Starting` → STARTING.
- `Online` → ONLINE, with `deviceId`, `pairingCode` and `warning` copied **verbatim** from the state.
- `Reconnecting` → RECONNECTING, with `message = RetryIn(ceil(retryInMs / 1000))` only when `retryInMs >= 0`. For `-1`, don't set `message`, so no countdown shows.
- `Blocked` → BLOCKED.
- `PolicyMissing` → POLICY_MISSING.

Rules for the VM:
- `canStart = status == IDLE && relayConfigured`.
- `canStop = status != IDLE`.
- When `relayConfigured` is false and the status is IDLE, `message = NoRelay`.
- `start()` and `stop()` call the actions and change no state themselves: the state comes back through `connectionState`.
- `newCode()` launches `actions.pair()` in `viewModelScope` and **ignores the returned string** (P03: the code shown is always `Online.pairingCode` from the agent). If it throws anything other than `CancellationException`, set a one-shot `message = PairFailed` that clears on the next state emission.
- Combine `connectionState` with a private `MutableStateFlow<HostMessage?>` for the pair failure. Use `stateIn(viewModelScope, Eagerly, <initial from connectionState.value>)`.

**`HostScreen.kt`.** It has a stateful `HostScreen(viewModel)` and a stateless `HostContent(state, onStart, onStop, onNewCode)`. Content, top to bottom:
1. **Status line:** "Not hosting", "Starting…", "Hosting", "Reconnecting…", "Blocked by policy" or "Waiting for IT setup".
2. **When ONLINE,** "Device ID: <id>" and, if `pairingCode != null`, the code in large monospace text with the label "Setu code: read it to the developer". If `warning != null`, show one line: "Hosting warning: <warning>". AT-08 adds recovery.
3. **The message line:**
   - NoRelay: "No relay is configured in this build."
   - PairFailed: "Couldn't get a new code. Try again."
   - RetryIn: "Retrying in N s".
4. **Buttons:**
   - "Start hosting" (enabled only when `canStart`).
   - "New code" (only when ONLINE and `pairingCode != null`).
   - "Stop hosting" (shown whenever `canStop`, P17).

The screen has no text field. Copy must pass the P01 rule (no "approve", "sign in", "account" or "email").

**`MainActivity.kt`.**
- Keep the "Setu" title. Below it, add a `TabRow` with "Prepare" and "Host". Remember the selection with `rememberSaveable`, defaulting to Prepare. Prepare shows `SetupScreen`; Host shows `HostScreen`.
- Both VMs get `HostingRegistry.connectionState`, which replaces AT-05's `MutableStateFlow(Idle)`. Delete that placeholder comment and keep the AT-09 comment on `usbFallbackAllowed`.
- `HostingActions` is a small private object in `MainActivity.kt`:
  - `start()` = `HostingService.start(applicationContext, BuildConfig.SETU_RELAY_URL)`
  - `stop()` = `HostingService.stop(applicationContext)`
  - `pair()` = `HostingRegistry.pair()`
- Set `relayConfigured = BuildConfig.SETU_RELAY_URL.isNotBlank()`.

## 4. TDD: write these tests first, see them fail, then implement

Map each test to its acceptance ID in a comment. Use JUnit 4, coroutines-test (`Dispatchers.setMain`) and Turbine for VMs, and Robolectric `@Config(sdk = [35])` for Compose and the service. Use a fake `HostingActions` that records calls and scripts `pair()`.

- **`HostingRegistryTest` (app):**
  - P17: with nothing attached, the state is `Idle`.
  - After `attach(fake)`, emitting `Online` on the fake shows through.
  - `detach(fake)` returns the state to `Idle`.
  - `detach(other)` is a no-op.
  - `pair()` delegates to the attached fake, and with nothing attached it throws `IllegalStateException`.
  - Service wiring: building `HostingService` with Robolectric (reuse `HostingServiceTest`'s `TestHostingService` pattern in this test file) attaches the fake, and destroying it detaches it.
  - Detach in `@After` so tests don't leak global state.
- **`HostViewModelTest` (`:feature:host`):**
  - The mapping table for every `ConnectionState` (P03 and P10 hosting part: ONLINE carries the device ID and code verbatim).
  - `Reconnecting(retryInMs = -1)` gives no message; `Reconnecting(retryInMs = 2500)` gives `RetryIn(3)`.
  - P03: with `Online(pairingCode = "111111")`, `newCode()` where the fake `pair()` returns `"999999"` still shows `"111111"`. Emitting `Online(pairingCode = "222222")` then shows `"222222"`.
  - `pair()` throwing sets `PairFailed`, and the next state emission clears it.
  - `canStart`/`canStop` across IDLE and ONLINE; `relayConfigured = false` gives `canStart == false` and `NoRelay`.
  - `start()`/`stop()` call the actions exactly once and don't change `uiState` by themselves.
- **`HostContentTest` (Robolectric Compose):**
  - P17: "Stop hosting" exists for ONLINE and RECONNECTING and is absent for IDLE.
  - Clicking it calls `onStop`.
  - ONLINE with a code shows the code and "New code"; ONLINE without a code hides both.
  - RECONNECTING with no message shows no "Retrying in".
  - NoRelay shows its text, and "Start hosting" is disabled.
  - No node has a set-text action.
- **The existing `MainActivityTest` (P01) stays green unchanged.** Prepare is the default tab, so it still sees "Setu".

## 5. Gates (all must pass before you push)

```
./gradlew testDebugUnitTest detekt lint
./gradlew :app:assembleDebug
```

Use no `@Suppress`, no baselines, no detekt config change and no new disabled lint checks (AD-8). If a rule fires, change the code (split composables, move small contract classes as AT-05 did). If lint objects to the `buildConfigField` or anything else you can't fix in code, stop and report the exact error.

## 6. Architecture and Karpathy pillars (enforced at review)

- **Clean Architecture and SOLID.** UI (`HostContent`) → ViewModel (`HostViewModel`, `StateFlow`, UDF) → `HostingActions` and `StateFlow<ConnectionState>` (ports) → `:app` adapters (`HostingRegistry`, `HostingService`) → SDK. `:feature:host` doesn't depend on `SetuHost` or `:app`. Only `HostingService` starts or stops the SDK (AD-1).
1. **Think before coding.** The PR description opens with `## Assumptions & Trade-offs`. If A06, P03, P17, `API_SPEC.md` and this prompt disagree, stop and ask.
2. **Simplicity first.** Write the minimum code: no navigation library, no DI, no persistence, no sessions list, no countdown timer (the retry seconds come from the state as emitted, with no ticking), no recovery UI. Keep files under ~250–300 lines.
3. **Surgical changes.** Touch only the files in §2. `HostingService` gets exactly the attach and detach lines. Branch from latest `main` as `feature/AT-06-solo-hosting-screen`. Make atomic conventional commits (`test(android): …` red first, then `feat(android): …`). Commit only code for this ticket: no design docs or prototype files on this branch.
4. **Goal-driven TDD.** Commit the failing tests first, then the implementation. Paste the exact gate output in the PR.

## 7. PR and hard stop

Open one PR against `main` titled `feat(android): AT-06 solo hosting screen`, with this body:

```
Ticket: AT-06 (docs/TDD_TICKETS.md §6) · Acceptance: P03, P17, P10 (hosting part)

## Assumptions & Trade-offs
- …

## What changed
- one line per file

## Test evidence
<red run excerpt>
<full green output of ./gradlew testDebugUnitTest detekt lint and :app:assembleDebug>

## Out of scope (left for later tickets)
- sessions list and End (AT-07), adbd recovery and pairing guide (AT-08), managed/blocked screens and EMM relay (AT-09), relay URL setting and notification-denial fallback (AT-10)
```

Then **stop immediately**. Don't start AT-07, don't edit `docs/`, and don't merge.
