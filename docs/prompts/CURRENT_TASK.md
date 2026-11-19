# Builder prompt · AT-02 · Hosting foreground service and notification

You are the builder for one ticket in `SumukhaK/Setu-mobile`. Do this ticket only, open one PR, then stop.

## 0. Read first (in this order, nothing else)

1. `docs/CODEBASE_MEMORY.md` (repo map, interfaces, AD-1 to AD-10).
2. `docs/TDD_TICKETS.md` §2.6 (notification decision) and §6 "AT-02".
3. Setu-Desktop `docs/JOURNEYS.md` rows P06 and P17: https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md
4. Setu-SDK v1.1.0 `API_SPEC.md` §4.1 (`SetuManager`) and §4.4 (notifications): https://github.com/SumukhaK/Setu/blob/v1.1.0/API_SPEC.md
5. Existing code you will extend: `core/setu/src/main/.../SetuHost.kt`, `SetuManagerHost.kt`, `core/setu/src/test/.../SetuManagerHostTest.kt`, `app/src/main/AndroidManifest.xml`, `app/build.gradle.kts`.

The SDK's sample `AgentService` uses `VISIBILITY_PRIVATE` and posts `text`. **Do not copy it.** This ticket uses the stricter rule in AD-2.

## 1. Goal

Add a foreground service that owns the Setu agent's lifecycle and a lock-screen-safe notification. It is the only place that calls `SetuManager.initialize`, `start`, `stop` and `refreshPolicy`. It reacts to EMM restriction changes and keeps the notification in sync with `connectionState` and `sessions`. There is no UI work: AT-05 and AT-06 will call the service's start and stop helpers.

## 2. Files (create or change only these)

```
core/setu/src/main/.../SetuHost.kt                  add sessions, refreshPolicy, nullable start (see §3)
core/setu/src/main/.../SetuManagerHost.kt           delegate the new members
core/setu/src/test/.../SetuManagerHostTest.kt       add one wiring test for sessions (see §4)
app/src/main/AndroidManifest.xml                    service, FGS permissions, special-use property
app/src/main/kotlin/dev/setu/mobile/service/HostingService.kt
app/src/main/kotlin/dev/setu/mobile/service/HostingNotification.kt
app/src/main/res/values/strings.xml                 channel name, FGS subtype text (create if absent)
app/src/test/kotlin/dev/setu/mobile/service/FakeSetuHost.kt
app/src/test/kotlin/dev/setu/mobile/service/HostingNotificationTest.kt
app/src/test/kotlin/dev/setu/mobile/service/HostingServiceTest.kt
app/build.gradle.kts + gradle/libs.versions.toml    only if you add androidx-core-ktx (see §3); also remove the unused debugImplementation(ui-test-manifest)
```

## 3. Contract to implement (decided by the architect; do not reinterpret)

**`SetuHost` changes (AD-7).** These mirror the SDK's own signatures:

```kotlin
interface SetuHost {
    val connectionState: StateFlow<ConnectionState>
    val policyStatus: StateFlow<PolicyStatus>
    val sessions: StateFlow<List<DeviceSession>>
    fun start(config: SetuConfig? = null)   // null reuses the last config (SDK behaviour)
    fun stop()
    fun refreshPolicy(): PolicyStatus
}
```

`SetuManagerHost` still only delegates. Existing AT-01 tests must stay green without edits, apart from the one added test.

**`HostingNotification` (P06, AD-2).** It has no state and no SDK calls of its own.
- `fun build(context: Context, content: NotificationContent): Notification`, using the platform `Notification.Builder` (minSdk 29 needs no compat).
- Title is `content.title`. Content text is `content.publicText` in **both** the main notification and the `setPublicVersion(...)` copy. `content.text` is never read.
- Use `setVisibility(Notification.VISIBILITY_SECRET)`, `setOngoing(true)` and `setOnlyAlertOnce(true)`, on channel id `"hosting"`. Use a platform small icon (`android.R.drawable.stat_sys_data_bluetooth`) for now.
- `fun ensureChannel(context: Context)` creates channel `"hosting"` with `IMPORTANCE_LOW` and the name from `strings.xml`.
- Notification id is the constant `NOTIFICATION_ID = 1`.

**`HostingService` (AD-1).** It is an `open class HostingService : Service()` that is not exported and declares `android:foregroundServiceType="specialUse"`. Add a `<property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" android:value="@string/fgs_subtype"/>` that explains the use, for example "Hosts an encrypted remote ADB debugging session for a paired desktop". Add the `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE` and `POST_NOTIFICATIONS` permissions. The SDK's network permissions already merge in from the AAR, so don't add them.
- Companion helpers: `fun start(context: Context, relayUrl: String)` calls `startForegroundService` with extra `EXTRA_RELAY_URL`. `fun stop(context: Context)` calls `stopService`.
- `protected open fun createHost(): SetuHost = SetuManagerHost(SetuManager.initialize(SetuManager.Builder(this)))`. This is the only `initialize` call in the app. Tests subclass the service and override it. Don't use a global or static test hook.
- `onCreate`: create the host and the channel. Register a receiver for `Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED` with `ContextCompat.registerReceiver(..., ContextCompat.RECEIVER_NOT_EXPORTED)`, and add `androidx-core-ktx` to the catalog if it isn't declared. On receive, call `host.refreshPolicy()` then `host.start()`. Then collect `combine(host.connectionState, host.sessions, SetuNotifications::content)` on a `MainScope()` and post each result through `NotificationManager.notify(NOTIFICATION_ID, HostingNotification.build(...))`.
- `onStartCommand`: first call `startForeground(NOTIFICATION_ID, HostingNotification.build(this, SetuNotifications.content(host.connectionState.value, host.sessions.value)), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)`. Then call `host.start(SetuConfig(relayUrl = it))` if the intent carries a relay URL, otherwise `host.start()`. Return `START_NOT_STICKY` (no persistence; settings storage arrives in AT-10).
- If `host.start` throws `GenAdbException.NotConfigured`, call `stopSelf()` and don't crash. Catch only that exception. Don't wrap anything else in `runCatching`.
- `onDestroy`: call `host.stop()`, unregister the receiver, cancel the scope, and `stopForeground(STOP_FOREGROUND_REMOVE)`.
- Never log anything, and never put `content.text` or a pairing code into an intent, a log or a notification.

## 4. TDD: write these tests first, see them fail, then implement

Map each test to its acceptance ID in a comment. Use Robolectric with `@Config(sdk = [35])` unless noted.

- **P06, notification:** given `SetuNotifications.content(ConnectionState.Online(deviceId = "dev-1", pairingCode = "4321-908172"), emptyList())`, the built notification has `visibility == VISIBILITY_SECRET`, its `EXTRA_TEXT` equals `content.publicText`, and its `publicVersion` text equals `content.publicText`. Gather every `CharSequence` in `extras` for both versions, plus `tickerText`. None of them contains `"4321-908172"` or `"4321908172"`. Add a table over `Idle`, `Starting`, `Reconnecting`, `Blocked` and `PolicyMissing` checking the same rule: text is always `publicText`.
- **P06, permission denied (`@Config(sdk = [33])`):** with `POST_NOTIFICATIONS` denied through the shadow app, starting the service still calls `host.start(...)` once and doesn't throw.
- **Start:** `onStartCommand` with `EXTRA_RELAY_URL = "wss://relay.test/"` puts the service in the foreground with the notification id and calls `FakeSetuHost.start` once with that URL. Without the extra, it calls `start(null)`.
- **Notification follows state:** after `FakeSetuHost` moves `connectionState` to `Online(...)` and `sessions` to one session, the posted notification text equals `SetuNotifications.content(state, sessions).publicText`. Idle the main looper; don't sleep.
- **Restrictions changed:** broadcasting `ACTION_APPLICATION_RESTRICTIONS_CHANGED` calls `refreshPolicy()` then `start(null)`, in that order.
- **NotConfigured:** when `FakeSetuHost.start` throws `GenAdbException.NotConfigured()`, the service stops itself and nothing throws.
- **P17, stop hosting:** destroying the service calls `host.stop()` once, removes the foreground notification, and unregisters the receiver, so a later broadcast doesn't call `refreshPolicy`.
- **`:core:setu` wiring:** using the existing real-SDK seam, after `session_open` (`{"event":"session_open","session_id":"a1","peer_label":"ci-laptop","transport":"relay-wss","kind":"adb"}`), `host.sessions` holds one session with id `a1`. After `host.stop()`, it's empty.

`FakeSetuHost` is a plain class with `MutableStateFlow`s and call recorders. It has no mocking library and no logic beyond recording (AD-10).

## 5. Gates (all must pass before you push)

```
./gradlew testDebugUnitTest detekt lint
./gradlew :app:assembleDebug
```

Use no `@Suppress`, no baselines, and disable no new lint checks (AD-8). If a gate fails for a reason outside this ticket, stop and report the exact error.

## 6. Architecture and Karpathy pillars (enforced at review)

- **Clean Architecture and SOLID.** The service depends on `SetuHost`, never on `SetuManager`, except in the one `createHost()` line (DIP). `HostingNotification` only builds, and `HostingService` only does lifecycle and wiring (SRP). Don't add ViewModels, use cases, DI frameworks, Application subclasses or a repository layer: no ticket needs them yet.
1. **Think before coding.** The PR description opens with `## Assumptions & Trade-offs`. If the ticket, this prompt, JOURNEYS and `API_SPEC.md` disagree, stop and ask.
2. **Simplicity first.** Write the minimum code: no wake locks, no boot receiver, no notification actions or "Stop" button (AT-06), no session list, no retries. Keep files under ~250–300 lines.
3. **Surgical changes.** Touch only the files in §2. Don't edit `docs/`, `README.md` or the prototype. Branch from latest `main` as `feature/AT-02-hosting-service`. Make atomic conventional commits, for example `test(android): add hosting service and notification tests`, `feat(android): extend SetuHost with sessions and refreshPolicy`, `feat(android): add hosting foreground service with lock-screen-safe notification`.
4. **Goal-driven TDD.** Commit the failing tests first (red), then the implementation (green). Paste the exact gate output in the PR.

## 7. PR and hard stop

Open one PR against `main` titled `feat(android): AT-02 hosting foreground service and notification`, with this body:

```
Ticket: AT-02 (docs/TDD_TICKETS.md §6) · Acceptance: P06 (clarified), P17 (stop hosting)

## Assumptions & Trade-offs
- …

## What changed
- one line per file

## Test evidence
<red run excerpt showing the new tests failing>
<full green output of ./gradlew testDebugUnitTest detekt lint and :app:assembleDebug>

## Out of scope (left for later tickets)
- readiness (AT-03/04), setup UI and the in-app Stop control (AT-05/AT-06), sessions list and End (AT-07), settings storage for the relay URL (AT-10)
```

Then **stop immediately**. Don't start AT-03, don't edit `docs/`, and don't merge.
