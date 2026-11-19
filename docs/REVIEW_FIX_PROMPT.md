# Review fix prompt · AT-03 · round 1 (PR #8)

You are the builder for `SumukhaK/Setu-mobile`. Fix only what is below, on the existing branch `feature/AT-03-readiness-engine` (PR #8). Push to the same PR. Do not open a new PR, do not merge, then stop.

## Verdict

Everything else in PR #8 passes review: scope, P04 branch table, step sets, SDK override, checks, `RecheckOnResume`, the extra `AndroidManifest.xml` (`ACCESS_NETWORK_STATE`) and the Assumptions block. Gates were green. One function deviates from the AT-03 contract.

## Finding: `usbEndpointStep` does not follow §3

File: `core/readiness/src/main/kotlin/dev/setu/mobile/core/readiness/Readiness.kt`

The contract says: `USB_TCPIP_ENDPOINT` is YES only when `Online.adbdEndpoint == "127.0.0.1:5555"`. `Online` with **another endpoint** or the **`adbd_unreachable` warning** gives NO. **Any other state gives UNKNOWN.**

The current code has two gaps:

1. `Online(adbdEndpoint = "127.0.0.1:5555", warning = "adbd_unreachable: …")` returns **YES**, so `USB_TCPIP_ENDPOINT = YES` while `AGENT_REACHES_ADBD = NO` in the same report. It must be **NO**. The warning wins here too, as your own Assumptions already say for `agentStep`.
2. `Online(adbdEndpoint = null, warning = null)` returns **NO**. It must be **UNKNOWN**, because the SDK gave no endpoint evidence.

Required order (mirror `agentStep`):

```
not Online                                  -> UNKNOWN
warning contains "adbd_unreachable"         -> NO
adbdEndpoint == "127.0.0.1:5555"            -> YES
adbdEndpoint != null (any other endpoint)   -> NO
else                                        -> UNKNOWN
```

## TDD (red first)

In `ReadinessTest.kt`, add two cases on the `UsbTcpip` path. Tag both `// P04`.
- Loopback endpoint plus `adbd_unreachable` warning → `USB_TCPIP_ENDPOINT == NO` and `ready == false`.
- `Online(deviceId = "dev-1")` with no endpoint and no warning → `USB_TCPIP_ENDPOINT == UNKNOWN`.

Commit 1: `test(android): AT-03 usb endpoint warning and null endpoint cases` (red). Commit 2: `fix(android): AT-03 usb endpoint step follows contract` (green).

## Rules

- Touch only `Readiness.kt` and `ReadinessTest.kt`. No other refactors, no `@Suppress`, no baselines.
- Optional (nit, only if trivial): one `NotificationCheck` case below API 33 (`@Config(sdk = [32])`) via `ShadowNotificationManager.setNotificationsEnabled`. Skip it if it pulls in anything new.

## Gates (paste the exact output in a PR comment)

```
./gradlew testDebugUnitTest detekt lint
./gradlew :app:assembleDebug
```

Paste the red excerpt plus both green outputs in one PR comment titled `Review fix round 1`. Then **stop**.
