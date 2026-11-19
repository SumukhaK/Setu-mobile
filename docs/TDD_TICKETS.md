# Setu re-review against Setu-SDK v1.1.0, with TDD tickets

Re-review date: 2026-11-19 · Reviewed: `SumukhaK/Setu-Desktop` main @ `57fd2d2`, `SumukhaK/Setu-mobile` main @ `2f26889`, `SumukhaK/Setu` tag `v1.1.0` @ `921aded` · Read-only, no repository was changed, MP4s ignored.

Companion to the first architecture and UX audit against v1.0.1.

> **Status in this repository.** The section 2 and section 3 baseline updates are applied in [Setu-Desktop `docs/JOURNEYS.md`](https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md) (canonical, including P01–P22) and in each repository's `docs/SCREENS.md`. The prototype fixture changes in section 2.7 are not applied yet. The same file lives in both Setu-Desktop and Setu-mobile.

---

## 0. Verdict

**The design-level flaws from the first audit are fixed. But the specs were aligned to v1.0.1, not v1.1.0, so they are now one SDK version behind.** Every "magic" state is gone, and `JOURNEYS.md` is honest about what was missing. The problem is that it still labels as "SDK or service gap" most of the capabilities v1.1.0 now ships. If you hand the current specs to a builder model, it will build workarounds, "Unknown" placeholders and "integration preview" banners for things the SDK now provides natively.

Before Ticket 1, do a docs-only pass. Rebase `JOURNEYS.md`, both `SCREENS.md` files and both prototypes onto v1.1.0 (section 2), and replace P05, P10, P12 and P14 as written in section 3. It's roughly a day of work and prevents a whole class of wrong code.

Four things are still open after v1.1.0. They are small, but they matter for a corporate product:

1. **The phone cannot trust the "who is connected" name, even in corporate.** `peer_label` prefers the label the desktop sends about itself over the verified corporate user (`device.go` `peerLabel`). Bob's desktop can announce itself as "alice". The SDK needs to expose the verified subject separately (proposed `peer_user`, `peer_fingerprint`). Until then the phone UI must label the text as "Computer name (unverified)".
2. **The desktop learns the transport (LAN vs relay) only after an outage.** `path_up` and `path_down` carry `transport`, but nothing reports it when the session first connects. `session_up` has none, and the audit `session_start` record exists only when audit is on. Solo shows "Path unknown" until the first drop. Proposed fix: add `transport` to `session_up` or a `stream_open` event.
3. **The session cap is now enforced, but its deadline is not exposed.** `max_session_seconds` is a hard cap (`-32025`), but `SessionInfo` has no `expires_at`, and the phone may hold a lower per-device cap. The prototype's "Corporate time limit in 5 minutes" banner is still unbacked. Keep P13 gated, and render a good end state on `-32025`.
4. **Solo pins are still permanent on the phone.** There is no trusted-desktop list or revoke. Ending a session works now (`endSession`), but the desktop can reconnect while the phone is hosting. That's acceptable for a corporate-first product (corporate uses grants and relay revocation), but say so in the solo copy.

---

## 1. First-audit fixes: status

| First-audit item | Status | Evidence |
| --- | --- | --- |
| Phone approval, "awaiting approval", opt-in "remember" | Fixed: removed | JOURNEYS J3.4, P01 |
| Pairing code timer, renew, alphanumeric format | Fixed: digits-only `NNNN-NNNNNN`, no timer | J1, P02, P03 |
| Pairing code on lock screen | Fixed in spec | J2 Android 13+ row, P06. See section 2.6 for a conflict with SDK 4.4 |
| Android 11+ vs Android 10 / cellular branch | Fixed | J2 table, A02 to A04, P04 |
| `adb pair` for Android 11+ | Spec'd as a gap; **now native in v1.1.0** | Update J2 and P05 (section 2.1) |
| OEM battery, MIUI install, notification permission | Fixed | J2, A05 |
| "ADB attached" from local adb, not the SDK | Fixed | J3.3, P09 |
| Fake RTT, region, offline badges | Fixed: removed; "Path unknown" | J3.2, D04 |
| Reconnect UX (silent, holding, lost) | Spec'd as a gap; **now native** (`path_*` events) | Update J5, P14 |
| Daemon serial dispatch, no cancel | Not addressed in spec; **now native** | New tickets DT-01, DT-04 |
| Token refresh without restart | Spec'd as a gap; **now native** (`auth.set_token`, identity-file watch) | Update J4, P12 |
| Corporate directory and presence | Spec'd as a gap; **now native** for corporate (`devices.presence`) | Update J3.1, P08 |
| Persisted revocation | **Now native** (relay `revocations.json`) | J4 note on revocation |
| Session cap | **Now a hard cap** (`-32025`); deadline still not exposed | J4 row, P13 |
| Grant map leaked to phones | **Now native** (`scopePolicyJson`, `/v1/policy?device=`) | J1 EMM note |
| Email OTP accounts | Fixed: solo has no account; corporate uses OIDC with PKCE | J1, D01 |
| Desktop "Solo locked" theatre | Fixed: marked informational | J1 |
| Audit page integrity-first, SDK export | Fixed | J6, D08, P15 |
| `doctor` diagnostics, relay, pin and proxy settings | Fixed | J6, D09, D10, P16 |
| Duplicate journey docs | Fixed: Android links to the desktop's canonical `JOURNEYS.md` | `Setu-mobile/docs/SCREENS.md` |

---

## 2. What to change in JOURNEYS.md, SCREENS.md and the prototypes for v1.1.0

### 2.1 Global

- Change the baseline line to: Setu SDK **v1.1.0** at `921aded`. Re-point every `d6335c6` source link to the v1.1.0 tag. Update the desktop footer "Setu SDK v1.0.1" and the Android host text "Setu SDK v1.0.1 reports host status…".
- Turn each "SDK or service gap" paragraph into an "SDK binding" paragraph naming the method or event below. Keep "SDK or service gap" only for the four open items in section 0.
- Add a version-skew rule. A v1.1 desktop talking to a v1.0 phone agent gets `-32024 unsupported` for `pair_adb`, and receives no `peer_closed` or session events from that phone. Show "Update Setu on the phone to use this", and never a generic error.

### 2.2 J2 · Android 11+ pairing

Replace the whole "SDK or service gap" paragraph with:

> Desktop calls `session.pair_adb {device_id, pairing_code, pairing_port?, timeout_ms?}`. `pairing_port` 0 or absent asks the phone to discover `_adb-tls-pairing._tcp` itself, so the form can make the port optional. The six-digit code goes only to the local `adb pair`, and travels inside adb's SPAKE2 exchange, which the tunnel also encrypts. Result: `{device_id, paired, transport, output?}`. Errors: `-32023 adb_pair_failed` (wrong code, dialog closed, wrong port) and `-32024 unsupported` (phone runs a 1.0 agent). An `adb_pair` event reports the outcome. The daemon flag `--adb PATH` selects adb.

D05 drops "requires an adapter and hardware validation". It stays behind a feature flag only until the device-lab run passes. Remove the desktop prototype's `wirelessDialog` notice "SDK v1.0.1 has no dedicated pairing RPC", and make the port field optional with the hint "Leave empty to let the phone find it".

### 2.3 J3 · Device selection, transport and peers

- **J3.1, corporate:** list devices from `devices.presence` → `{device_id, online, connected_at?, transport?, sessions}`. It contains only the user's granted devices, and revoked devices show as offline. Poll every 30 s, and also on `events.dropped` and on window focus. Fresh means the last successful poll was under 60 s ago; anything older shows "Last seen unknown". Solo keeps `devices.list` with presence unknown. Note that `transport` here is how the phone reaches the relay, not the session path, so don't show it as the session's path.
- **J3.2, transport strip:** show the path from the latest `path_up` / `path_down` `transport` for that session's tunnel. Before any path event, use the audit `session_start.transport` when audit is on (corporate always). Otherwise show "Path unknown". This is open item 2.
- **J3.4, Android peers:** bind `SetuManager.sessions: StateFlow<List<DeviceSession>>` with `id`, `peerLabel`, `transport`, `kind` (`adb` or `adb-pair`), `openedAtMs` and `path`. Each row gets an **End** button → `endSession(id)`. The desktop then receives `-32026 peer_closed` and does not retry. Show the label as "Computer name (unverified)" plus `transport` (open item 1). In A08, remove "Current peer Unknown / Peer transport Unknown / future SDK event".
- **Desktop label:** the desktop starts the daemon with `--label "<user-chosen computer name, default hostname>"`. Otherwise the phone shows `desktop-<8 hex>`.

### 2.4 J4 · Corporate denials

Add rows:

| Signal | Screen and recovery |
| --- | --- |
| `-32025` session_expired / `session_expired` event | **Your organization's session time limit was reached.** One-click **Reconnect** runs a fresh `session.connect` (re-authenticates). No retry loop. |
| `-32026` peer_closed / `peer_closed` event | **The session was ended on the phone.** Show `peer_reason` if present. No automatic retry; **Reconnect** is manual. |
| `-32022` cancelled | Silent: the user cancelled. Return to the previous screen. |
| `-32024` unsupported | **The phone's Setu app is out of date for this feature.** |
| `-32027` busy | Internal: back off and retry once. Never shown to the user. |

Replace the `-32015` / `-32016` text about "no token-update RPC" with: the token refresher (your OIDC adapter) writes the new Setu JWT atomically to the workspace's `--identity-file`. The daemon picks it up within 2 s, or the app calls `auth.set_token {token}` directly → `{subject, token_id?, expires_at}`. Nothing restarts and no session drops. A token for a different `subject` is rejected while sessions are live: stop the sessions first. Show "Signed in as a different user. End current sessions to switch." Watch for `token_updated` events, and for `error` events from a bad identity file.

Policy time cap row: "The relay and both endpoints enforce `max_session_seconds` as a hard cap counted from the tunnel handshake. Rejoins do not extend it. No authoritative deadline is exposed (open item 3), so no countdown is shown."

### 2.5 J5 · Reconnect

Replace the gap paragraph with:

> Bind `path_down {session_id, reason, transport}`, `path_up {session_id, transport, outage_ms}` and `path_lost {session_id, reason, outage_ms}`. `fields.session_id` is the 16-hex **tunnel** id, and `event.session` is the client session (`s1`). A client session can carry several tunnels (one per adb TCP connection), so key the banner state by tunnel and roll up to the session. A tunnel emits at most one `path_down` per outage, then exactly one `path_up` or `path_lost`. A normal close emits nothing. 0 to 10 s after `path_down`: no UI. 10 to 90 s: amber holding banner. `path_up`: clear, and update the transport (it may switch, for example relay-wss to lan). `path_lost`: "Phone unreachable. Re-attach ADB when it's back." The outer `retrying` / `session_down` events still apply on top. On Android, read the per-session path from `sessions[].path` rather than `Online.path`, which holds only one path.

Also add a daemon lifecycle paragraph. The desktop starts `setu-daemon --listen 127.0.0.1:0 …` and reads the single `daemon_ready` JSON line from stdout (`listen`, `token_file`, `pid`, `version`). It keeps one events connection and one control connection, and uses unique request ids. Requests now run concurrently (128 in flight per connection), so a connect can be cancelled with `session.cancel {request_id}`.

### 2.6 Notification conflict to resolve

JOURNEYS J2 and P06 say `VISIBILITY_SECRET`, with no code "in either notification variant". SDK 4.4 recommends `VISIBILITY_PRIVATE` plus a public version built from `SetuNotifications.content(...).publicText`, where `text` may contain the code on an unlocked phone. Pick one. My recommendation is to keep the stricter spec. Use `SetuNotifications.content` for wording, put `publicText` in both the private and public versions, and keep `VISIBILITY_SECRET`. The code then appears only inside the app. Write this explicitly into A09, or a builder will copy the SDK's example and fail P06.

### 2.7 Prototype fixtures to update

- Desktop: the transport strip gets real `path_*` fixtures; the "Rejoin stage · Integration preview" selector becomes event-driven fixtures; the time-limit banner is replaced by a `-32025` end state; add `-32025`, `-32026` and `-32024` scenarios; the pair dialog gets a cancel button bound to `session.cancel`.
- Android: the host screen gets a sessions list (peer, transport, path, End); the notification preview shows `publicText` only; add a "peer ended from phone" scenario.

---

## 3. P01–P17 against v1.1.0, plus missing tests

| ID | Status | Change |
| --- | --- | --- |
| P01 | OK | none |
| P02 | OK | none |
| P03 | OK | none |
| P04 | OK | none |
| P05 | **Rewrite** | Given Android 11+ and a paired device, when the user submits a 6-digit system code (and optionally a port), then the desktop calls `session.pair_adb` once with exactly those params. `paired:true` → show "Debugger paired" and enable **Connect ADB**. `-32023` → keep the form, ask for a fresh code. `-32024` → "update the phone". The code never appears in logs, diagnostics, crash reports or persisted state. |
| P06 | **Clarify** | Add "built from `SetuNotifications.content().publicText`; `text` is never posted". |
| P07 | OK | Add: a policy containing other devices' grants is scoped before use (SDK does this; the app must not cache the unscoped JSON). |
| P08 | **Rebind** | Corporate presence comes from `devices.presence`. Fresh is a poll under 60 s old. A revoked device shows offline. Solo stays unknown. |
| P09 | **Rebind** | Transport comes from `path_*` events, else audit `session_start`, else "Path unknown". Never from `devices.presence.transport`. |
| P10 | **Rewrite** | Phone lists `sessions` with label, transport and path. **End** calls `endSession(id)` and returns `true`. The desktop shows the `peer_closed` end state and does not retry. The label is shown as unverified. Stop hosting clears the list. |
| P11 | **Extend** | Add `-32022` (silent), `-32024`, `-32025`, `-32026`, `-32027` (internal retry). |
| P12 | **Rewrite** | Rotation via the identity file or `auth.set_token`: live sessions keep running, `token_updated` is received, and no daemon restart happens. A different-subject token with live sessions → rejected, old token stays, user is told to end sessions. A malformed file → `error` event, old token stays. |
| P13 | **Narrow** | With no `expires_at` signal, no warning or timer appears. On `-32025` or `session_expired`, show the end state with a one-click re-auth Reconnect and no auto-retry. |
| P14 | **Rebind** | Drive it with `path_down`, `path_up` and `path_lost` keyed by tunnel id. Recovery at 9 s never shows UI; at 50 s it shows holding then clears; past 90 s it shows `path_lost`. `path_*` for a stopped session or stale tunnel is ignored. A denial overrides. |
| P15 | OK | none |
| P16 | **Clarify** | Relay, pin and proxy are daemon start flags. Changing them restarts that workspace's daemon after a confirmation that names the live sessions it will end. |
| P17 | OK | Add: closing the window keeps the daemon process; **Quit** stops it. |

New tests:

| ID | Given and when | Then |
| --- | --- | --- |
| P18 | The app starts its workspace daemon; another daemon already serves that state dir; the daemon crashes | Reads `daemon_ready`, authenticates with `token_file`; attaches to the existing daemon instead of starting a second writer; restarts with backoff after a crash and re-lists sessions. |
| P19 | A `session.connect` to an offline device is pending and the user presses Cancel | `session.cancel {request_id}` → the connect resolves with `-32022`, the UI returns to the device list, and `session.list` shows no orphan. |
| P20 | A v1.1 desktop and a v1.0 phone agent | `pair_adb` → `-32024` copy; no phone session UI is promised; connect and attach still work. |
| P21 | The events subscriber receives `events.dropped {count}` | The store resyncs `session.list` (and `devices.presence` in corporate) before applying further events. No stale "connected" remains. |
| P22 | A corporate desktop connects with `--label "alice"` while its token subject is "bob" | The phone shows the label as unverified. Once the SDK exposes a verified subject, it shows "bob". |

---

## 4. Implementation assumptions

The repos are still wireframes, so the tickets fix a stack. Change it once, here, if you disagree:

- **Desktop:** Tauri v2. The Rust native core lives in `src-tauri/`, and the TypeScript UI in `src/` (React + Vite). Test tools are `cargo test` for Rust and Vitest + Testing Library for the UI. The UI reaches the daemon only through Tauri commands, mirroring the prototype's `window.setuDesktopRpc(method, params)` hook. `setu-daemon` v1.1.0 is bundled as a Tauri sidecar per OS and arch.
- **Android:** Kotlin, Jetpack Compose, minSdk 29. Modules are `:app`, `:core:setu` (SDK adapter), `:core:readiness` and `:feature:*`. Depend on `setu-android-1.1.0.aar` from a Maven repo. Tests use JUnit 4/5, Turbine and Robolectric for Android-framework units; instrumented tests are kept to the service.
- **Testing seam for the Android SDK:** `SetuManager` has an internal constructor, so don't mock it. Build a real one with `SetuManager.Builder(ctx).agentLauncher(FakeAgentLauncher).policyProvider(FakePolicyProvider).scope(testScope)`. `FakeAgentLauncher` returns a process whose stdout replays agent JSON lines (`online`, `pairing_code`, `session_open`, `path_down`…), so the real SDK reducers run in tests. Wrap it behind your own `SetuHost` interface for ViewModel tests.
- **Testing seam for the desktop:** `FakeDaemon` is an in-process JSON-RPC 2.0 line server in Rust test support, plus a TS fake of the Tauri command bridge. It scripts responses, delays, errors and events. `FakeAdbServer` speaks the `host:track-devices-l` protocol.
- **Every ticket:** write the listed P-tests first (red), implement until green, and leave no other behaviour change. Each ticket is one PR.

---

## 5. Setu-Desktop tickets (in order)

### DT-01 · JSON-RPC client core
- **Files:** `src-tauri/src/rpc/mod.rs`, `framing.rs` (newline framing, 1 MiB cap), `client.rs` (unique ids, a response map so out-of-order replies match, a notification channel), `errors.rs` (`data.kind` → `SetuError` enum for −32001 and −32010 to −32027, unknown kind → `Denied(raw)`), `src-tauri/tests/support/fake_daemon.rs`.
- **Tests first:** P11 (mapping table, incl. −32022/−32024/−32025/−32026/−32027), framing edge cases (split lines, oversize line), out-of-order responses, `-32027 busy` → one backoff retry.
- **SDK binding:** `auth`, `version`, the error table in API_SPEC §2.3.

### DT-02 · Daemon supervisor and workspaces
- **Files:** `src-tauri/src/daemon/supervisor.rs`, `workspace.rs` (state dir per workspace: `<app-data>/setu/solo`, `<app-data>/setu/corp/<org-slug>`), `ready_line.rs`, `src-tauri/tauri.conf.json` (sidecar `setu-daemon`).
- **Behaviour:** spawn `setu-daemon --listen 127.0.0.1:0 --state <dir> --relay <url> --label <name> --adb <path> [--relay-pin] [--proxy] [--mode corporate --identity-file <f> --policy <p>]`. Parse the one `daemon_ready` stdout line; read `token_file` in Rust only; `auth` on each connection; restart with backoff on exit; attach instead of spawning when a live daemon owns that state dir.
- **Tests first:** P18, P17 (process survives window close).
- **SDK binding:** daemon flags §2, `daemon_ready`, `auth`, `version`.

### DT-03 · Event hub and session store
- **Files:** `src-tauri/src/events/hub.rs` (dedicated events connection, `events.subscribe`), `src/state/sessionStore.ts` (reducer keyed by client session `s1…` and tunnel id), `src/state/clock.ts` (monotonic, injectable).
- **Tests first:** P21, P17 restore, out-of-order and stale-session events ignored (part of P14).
- **SDK binding:** `events.subscribe`, the `event` and `events.dropped` notifications, `session.list`, event types §1.5.

### DT-04 · Solo pairing form with cancel
- **Files:** `src/features/pair/codeFormat.ts`, `PairDialog.tsx`, `src-tauri/src/commands/session.rs`.
- **Tests first:** P02, P03, P19.
- **SDK binding:** `session.connect {pairing_code, timeout_ms}` → `SessionInfo`; `session.cancel {request_id}` → `-32022`; `-32013` → one combined message ("check the 10 digits, phone still hosting, a new code appears after 3 wrong tries"); `-32011` → unavailable.

### DT-05 · Local ADB adapter
- **Files:** `src-tauri/src/adb/track.rs` (`host:track-devices-l` to 127.0.0.1:5037, reconnect on adb server restart), `connect.rs` (`adb connect <adb_addr>`), `src-tauri/tests/support/fake_adb_server.rs`.
- **Tests first:** P09 (absent → unauthorized → offline → device; only an exact serial match counts).
- **SDK binding:** `SessionInfo.adb_addr`; `doctor` `adb` check for a missing binary → route to Diagnostics.

### DT-06 · Session card and status strip
- **Files:** `src/features/session/SessionCard.tsx`, `StatusStrip.tsx`, `transport.ts`.
- **Tests first:** P09 (transport source order: `path_*` → audit `session_start` → "Path unknown"; never `devices.presence.transport`), P17 disconnect.
- **SDK binding:** `session_up`, `listening`, `path_up.transport`, `audit` event `session_start.transport`, `session.stop {session_id}`.

### DT-07 · Path and rejoin banners
- **Files:** `src/features/session/rejoinMachine.ts` (per-tunnel state machine: idle → down(t0) → holding(≥10 s) → up | lost), `RejoinBanner.tsx`.
- **Tests first:** P14 (9 s no flicker, 50 s holding then clear, >90 s lost, denial overrides, stale tunnel ignored), transport switch relay-wss → lan updates the strip.
- **SDK binding:** `path_down`, `path_up`, `path_lost`, `retrying`, `session_down`.

### DT-08 · Devices list, forget and nicknames (solo)
- **Files:** `src/features/devices/DeviceList.tsx`, `DeviceDetail.tsx`, `src-tauri/src/store/nicknames.rs` (SQLite, keyed by exact `device_id`).
- **Tests first:** P08 solo part (presence unknown; nickname never alters the id), P17 forget (copy says it does not revoke on the phone).
- **SDK binding:** `devices.list`, `devices.forget {device_id}`, `session.connect {device_id}`.

### DT-09 · Tray and background
- **Files:** `src-tauri/src/tray.rs`, `src/app/windowLifecycle.ts`.
- **Tests first:** P17 (close hides the window and keeps the daemon and session; restore returns to the same session; Quit stops the daemon after confirming that live sessions will end).
- **SDK binding:** `session.list` on restore, `session.stop`.

### DT-10 · Android 11+ debugger pairing
- **Files:** `src/features/pair-adb/PairAdbDialog.tsx`, `src-tauri/src/commands/pair_adb.rs`, `src-tauri/src/log/redact.rs`.
- **Tests first:** P05 (rewritten), P20, redaction test (the 6-digit code never reaches the log sink, the crash reporter or the store).
- **SDK binding:** `session.pair_adb {device_id, pairing_code, pairing_port?, timeout_ms?}` → `{paired, transport, output?}`; `-32023`, `-32024`; `adb_pair` event; `session.cancel`.

### DT-11 · Diagnostics
- **Files:** `src/features/diagnostics/DiagnosticsPage.tsx`, `checks.ts` (unknown check names render generically).
- **Tests first:** P16 (fail, skip and a future check render detail and hint; no JWT, code or proxy credentials in the output).
- **SDK binding:** `doctor` → `{version, platform, ok, checks[{name,status,detail,hint}]}`.

### DT-12 · Settings: relay, pin, proxy
- **Files:** `src/features/settings/ConnectionSettings.tsx`, `src-tauri/src/daemon/config.rs`.
- **Tests first:** P16 clarification (validate the pin as 64 hex characters with optional colons; applying restarts only that workspace's daemon after naming the sessions it will end; never silently switches transport).
- **SDK binding:** daemon flags `--relay`, `--relay-pin`, `--relay-ca`, `--proxy`.

### DT-13 · This Computer's Audit Log
- **Files:** `src/features/audit/AuditPage.tsx`, `integrityBadge.ts`, `src-tauri/src/commands/audit.rs` (save to user-chosen path).
- **Tests first:** P15 (verified, unverified, tampered; warnings visible; a read error never shows Verified).
- **SDK binding:** `audit.verify` → `ChainStatus {valid, anchor, broken_at?, problem?, warnings?}`; `audit.report {format, since?, until?, include_events?}`; `-32021 audit_disabled` → "Audit is off for this workspace".

### DT-14 · Corporate sign-in and token rotation
- **Files:** `src-tauri/src/identity/oidc.rs` (system browser, Authorization Code + PKCE, loopback redirect), `issuer_client.rs` (calls your org token service with `identity.public_key`), `token_file.rs` (atomic write, 0600), `src/features/corporate/SignIn.tsx`.
- **Tests first:** P12 (rewritten), P01 corporate entry, P11 `-32015`/`-32016` → SSO.
- **SDK binding:** `identity.public_key`, `--identity-file` watch (2 s), `auth.set_token {token}` → `{subject, token_id?, expires_at}`, `token_updated` event, `error` event on a bad file.
- **Out of scope here:** the org token service, which is a backend ticket.

### DT-15 · Corporate device directory
- **Files:** `src/features/devices/CorporateDirectory.tsx`, `src/state/presenceStore.ts` (30 s poll, also on focus and `events.dropped`; fresh means under 60 s).
- **Tests first:** P08 (rebound), P21 corporate resync.
- **SDK binding:** `devices.presence` → `{devices:[{device_id, online, connected_at?, transport?, sessions}]}`; `session.connect {device_id}`.

### DT-16 · Corporate recovery and end states
- **Files:** `src/features/corporate/RecoveryPanel.tsx`, `endStates.ts`.
- **Tests first:** P11 (extended), P13 (narrowed), P10 desktop half (`-32026` / `peer_closed` → "ended on the phone", no retry), P22 desktop label setting.
- **SDK binding:** `-32014`, `-32015`, `-32016`, `-32017`, `-32018`, `-32025`, `-32026`; `session_expired` and `peer_closed` events.

---

## 6. Setu-mobile tickets (in order)

### AT-01 · Project scaffold and SDK test seam
- **Files:** `settings.gradle.kts`, `gradle/libs.versions.toml` (`setu-android:1.1.0`), `app/build.gradle.kts` (`packaging { jniLibs { useLegacyPackaging = true } }`), `core/setu/src/main/.../SetuHost.kt` (interface), `SetuManagerHost.kt`, `core/setu/src/test/.../FakeAgentLauncher.kt`, `FakePolicyProvider.kt`.
- **Tests first:** P01 (a fresh install starts solo with no account or approval UI), a smoke test that a scripted `online` and `pairing_code` reach `connectionState`.
- **SDK binding:** `SetuManager.Builder(...).agentLauncher().policyProvider().scope()`, `connectionState`, `policyStatus`.

### AT-02 · Hosting foreground service and notification
- **Files:** `app/src/main/.../service/HostingService.kt` (`foregroundServiceType="specialUse"` plus `PROPERTY_SPECIAL_USE_FGS_SUBTYPE`), `service/HostingNotification.kt`, `AndroidManifest.xml`.
- **Behaviour:** the only caller of `SetuManager.initialize`, `start`, `stop` and `refreshPolicy`. Registers `ACTION_APPLICATION_RESTRICTIONS_CHANGED` → `refreshPolicy()` + `start()`. Builds the notification from `SetuNotifications.content(state, sessions)` using `publicText` for both variants, with `VISIBILITY_SECRET` (section 2.6).
- **Tests first:** P06 (clarified), P17 (stop hosting clears the notification and sessions).
- **SDK binding:** `SetuManager.initialize`, `start`, `stop`, `refreshPolicy`, `SetuNotifications.content`, `connectionState`, `sessions`.

### AT-03 · Readiness engine
- **Files:** `core/readiness/.../SetupPathDetector.kt` (API level + `ConnectivityManager` transport → `WirelessDebugging` or `UsbTcpip`), `DeveloperOptionsCheck.kt` (`Settings.Global.DEVELOPMENT_SETTINGS_ENABLED`), `WirelessDebuggingCheck.kt` (best effort; confirm via SDK `Online.adbdEndpoint` and `warning`), `NotificationCheck.kt`, `RecheckOnResume.kt`.
- **Tests first:** P04 (branch selection for 10/Wi-Fi, 11/Wi-Fi, 15/cellular; policy can forbid the USB fallback).
- **SDK binding:** `ConnectionState.Online.adbdEndpoint`, `Online.warning` (`adbd_unreachable`).

### AT-04 · Battery and OEM readiness, MIUI install recovery
- **Files:** `core/readiness/.../BatteryCheck.kt` (`isIgnoringBatteryOptimizations`), `oem/OemIntents.kt` (resolve before launch, fall back to app details), `feature/setup/MiuiInstallSheet.kt`.
- **Tests first:** P04 OEM part, P06 denial path (hosting continues, in-app Stop visible).
- **SDK binding:** none (platform only).

### AT-05 · Guided setup UI
- **Files:** `feature/setup/SetupScreen.kt`, `SetupViewModel.kt`, `steps/*.kt` (Developer options, Wireless debugging, USB tcpip bootstrap with endpoint check, notifications, battery).
- **Tests first:** P04 end to end with fakes; the USB branch requires `Online.adbdEndpoint == 127.0.0.1:5555` before "unplug".
- **SDK binding:** `connectionState`, `Online.adbdEndpoint`.

### AT-06 · Solo hosting screen
- **Files:** `feature/host/HostScreen.kt`, `HostViewModel.kt`.
- **Tests first:** P03 (the code changes only when the agent emits a new `pairing_code`), P10 hosting part, `Reconnecting(retryInMs = -1)` renders without a countdown.
- **SDK binding:** `ConnectionState.Online(deviceId, pairingCode, adbdEndpoint, warning, path)`, `pair()`, `stop()`, `Reconnecting`, `GenAdbException.*`.

### AT-07 · Connected desktops and End session
- **Files:** `feature/host/SessionsList.kt`, `SessionRow.kt`.
- **Tests first:** P10 (rewritten: label shown as unverified, transport, path, End → `endSession(id)` true; unknown id → false, no crash), P14 phone half (row shows "reconnecting" on `DOWN`, removed on close), P22 phone half.
- **SDK binding:** `SetuManager.sessions: StateFlow<List<DeviceSession>>`, `DeviceSession(id, peerLabel, transport, kind, openedAtMs, path)`, `PathState`, `endSession(id)`.

### AT-08 · Debugger recovery and system pairing guidance
- **Files:** `feature/host/AdbdRecovery.kt`, `feature/setup/SystemPairingGuide.kt` (explains the Android dialog; the code is typed on the desktop, never into this app).
- **Tests first:** P10 `adbd_unreachable` part, P05 phone half (the app never asks for or stores the system code).
- **SDK binding:** `Online.warning`, `Online.adbdEndpoint`.

### AT-09 · Managed devices (EMM)
- **Files:** `feature/managed/ManagedScreens.kt`, `EnrollmentAckStore.kt` (stores a hash of `enroll_token`, so the transition shows once per enrollment).
- **Tests first:** P07 (transition once, waiting on `PolicyMissing("policy_json" | "enroll_token")`, `Blocked` → IT copy, no solo host or code in any managed state).
- **SDK binding:** `policyStatus`, `ConnectionState.PolicyMissing`, `ConnectionState.Blocked`, `pair()` → `PairingUnavailable` in corporate.

### AT-10 · Settings and device audit
- **Files:** `feature/settings/SettingsScreen.kt`, `feature/settings/DeviceAuditScreen.kt`, `res/xml/file_paths.xml` (FileProvider export).
- **Tests first:** P15 phone variant (shows `recentAuditEvents` read-only; exports `auditLogFile`; no in-app "Verified" claim, since verification happens with `setu audit verify`).
- **SDK binding:** `recentAuditEvents`, `auditLogFile`, `status()`.

---

## 7. Backend and SDK follow-ups (outside these repos)

- **Org token service** (required before DT-14 ships): takes an OIDC identity plus `identity.public_key` and returns an EdDSA Setu JWT with `cnf.key` binding and a short expiry; the refresher writes `--identity-file`.
- **EMM rollout guide:** push per-device policy from `GET /v1/policy?device=<id>`; `relay_pin` mandatory in corporate.
- **SDK v1.1.1 requests:** (1) `peer_user` (verified subject) and `peer_fingerprint` on `session_open` / `DeviceSession`; (2) `transport` on `session_up` or a `stream_open` event; (3) `expires_at` on `SessionInfo` / `session_up` when a cap applies; (4) solo `trustedDesktops()` / `revokeDesktop()` on the phone.
- **Device lab gate** before enabling DT-10 by default: Pixel (Android 15, Wi-Fi), Samsung (Android 14), Xiaomi (Android 10 tcpip, cellular), and one ColorOS phone. Cover pairing, a 60 s airplane-mode outage, `endSession`, and session cap expiry.
