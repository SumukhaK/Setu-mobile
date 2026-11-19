# Setu for Android

Browser wireframes for the native Setu Android companion. The prototype targets Setu-SDK v1.1.0 ([921aded](https://github.com/SumukhaK/Setu/commit/921aded)). The selected design uses Field's guided setup and Relay's bottom navigation. The host decides the setup path using Android version, network and managed policy.

[Current setup preview](docs/previews/current.png) · [Screen inventory and wireframes](docs/SCREENS.md) · [Canonical journeys and TDD acceptance tests](https://github.com/SumukhaK/Setu-Desktop/blob/main/docs/JOURNEYS.md)

## Open the current prototype

Open `index.html` in a browser. The scenario selector in the desktop review pane and the phone's three-dot menu can load Wireless debugging setup, the USB fallback, notification denial, managed policy waiting, and host recovery. Solo shows a current numeric Setu code only inside the app. Corporate uses EMM enrollment and grants, and **Stop Hosting** controls the whole device agent. **End** closes one connected computer’s session. Its displayed name is unverified.

The wireframe uses fixtures. The canonical journeys distinguish Android and SDK capabilities from planned integration, including the separate Android system pairing step.

## Build the app

The Android app lives in `:app` and `:core:setu` and uses the vendored Setu SDK 1.1.0 in `third_party/setu-android/`. You need JDK 17 and the Android SDK (API 35).

```sh
./gradlew testDebugUnitTest detekt lint   # unit tests and static analysis
./gradlew :app:assembleDebug              # debug APK
```

Work is tracked ticket by ticket in [docs/TDD_TICKETS.md](docs/TDD_TICKETS.md). Builders start from [docs/prompts/CURRENT_TASK.md](docs/prompts/CURRENT_TASK.md).

<details>
<summary>Historical walkthrough from before the SDK audit</summary>

This earlier recording includes concepts superseded by the current wireframes, including email verification, phone approval, and evidence sharing.

https://github.com/user-attachments/assets/92c42a6c-374a-443c-98e2-ba494b75ef8b

[Chapters and transcript](docs/walkthrough/TRANSCRIPT.md) · [English captions](docs/walkthrough/setu-walkthrough.en.vtt) · [Download MP4](docs/walkthrough/setu-walkthrough.mp4)

</details>
