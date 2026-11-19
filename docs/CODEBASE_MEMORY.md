# Setu-mobile · codebase memory

Read this first. It replaces a repo scan. Keep it under 150 lines; update it in every post-merge ritual.

Last updated: 2026-11-19 · main @ bootstrap (pre AT-01) · SDK baseline: Setu-SDK v1.1.0 (`SumukhaK/Setu` tag `v1.1.0`, commit `921aded`)

## Pipeline

- Architect/reviewer: Claude. Builders: one ticket per PR from `docs/TDD_TICKETS.md`, branch from latest `main`.
- Builder prompts are issued in Setu-Desktop `docs/prompts/CURRENT_TASK.md` while desktop tickets run; an Android ticket gets its own `docs/prompts/CURRENT_TASK.md` here when issued.
- Acceptance tests: Setu-Desktop `docs/JOURNEYS.md` P01–P22 (canonical for both apps). Screens: `docs/SCREENS.md` here.
- SDK contract: https://github.com/SumukhaK/Setu/blob/v1.1.0/API_SPEC.md (§4 Android SDK, §4.4 notifications, §1.5 events).

## Stack (fixed in TDD_TICKETS.md §4)

- Kotlin, Jetpack Compose, minSdk 29. Dependency `setu-android-1.1.0.aar` (package `dev.genadb.sdk`), with `packaging { jniLibs { useLegacyPackaging = true } }`.
- Modules: `:app`, `:core:setu` (SDK adapter behind our `SetuHost` interface), `:core:readiness`, `:feature:*`.
- Layers: `ui` (Compose + ViewModel, `StateFlow` UDF) → `domain/usecase` → `data/repository` wrapping `SetuManager`.
- Gates: `./gradlew testDebugUnitTest detekt lint`. Tests: JUnit, Turbine, Robolectric; instrumented tests only for the service.
- Test seam: never mock `SetuManager` (internal constructor). Build a real one with `SetuManager.Builder(ctx).agentLauncher(FakeAgentLauncher).policyProvider(FakePolicyProvider).scope(testScope)`; `FakeAgentLauncher` replays agent JSON lines.

## Directory map

```
README.md        prototype instructions
index.html       browser wireframe prototype (fixtures, not app code)
docs/
  SCREENS.md         phone screen inventory
  TDD_TICKETS.md     re-review + DT-*/AT-* tickets, AT status tracker
  CODEBASE_MEMORY.md this file
  previews/ walkthrough/
```

No application code exists yet. The Gradle project arrives with AT-01.

## Key public interfaces

(none yet; fill from merged PRs: module path, type/fn signature, one line of purpose)

## Wired SDK v1.1.0 bindings

| SDK API | Wired in | Ticket |
| --- | --- | --- |
| (none yet) | | |

## Architecture decisions (binding on builders)

- AD-1: `HostingService` (AT-02) is the only caller of `SetuManager.initialize`, `start`, `stop` and `refreshPolicy`.
- AD-2: Notifications use `SetuNotifications.content(...).publicText` for both variants; `text` is never posted (P06).
- AD-3: `peer_label` is shown as "Computer name (unverified)" until the SDK exposes a verified subject (P22).
- AD-4: Never cache the unscoped corporate policy JSON (P07).

## Completed tickets

| Ticket | PR | Summary |
| --- | --- | --- |
| (none yet) | | |

## Open items

- Next Android ticket: AT-01 · Project scaffold and SDK test seam (not issued yet; desktop DT-01 runs first).
- AAR distribution: confirm the Maven repo/coordinates that serve `setu-android:1.1.0` before AT-01 starts.
- SDK v1.1.1 asks: TDD_TICKETS.md §7 (peer_user/peer_fingerprint, solo trustedDesktops/revokeDesktop).
- Device lab gate (§7) before default-on Android 11+ pairing.
