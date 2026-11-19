# Vendored Setu Android SDK

The Setu Android SDK is not published to any Maven repository, so the official
1.1.0 build is vendored here and consumed from `:core:setu` with
`api(files("../../third_party/setu-android/setu-android-1.1.0.aar"))` (AD-5).

| Item | Value |
| --- | --- |
| Source repository | https://github.com/SumukhaK/Setu |
| Source tag | `v1.1.0` |
| Source commit | `921aded` (`921adedf1b4b30f24abb8a92bcc9b7b27ff619f5`) |
| Artifact | `setu-android-1.1.0.aar` |
| sha256 | `c5d3b36869a5c57a3345cee814aca5a8784ae86aebf0d78a65531d1cf03cf94c` |
| Size | 8,691,921 bytes |

## How it was obtained

Downloaded from the `v1.1.0` GitHub release asset
(`https://github.com/SumukhaK/Setu/releases/download/v1.1.0/setu-android-1.1.0.aar`),
whose published sha256 matches the hash above.

The release artifact is built from the same tag by the SDK's own Gradle module:

```sh
git clone --branch v1.1.0 https://github.com/SumukhaK/Setu.git
cd Setu/android
./gradlew :genadb-android:assembleRelease   # requires Go 1.24+
```

That task cross-compiles the Go agent into `jni/arm64-v8a/libgenadb.so` and
`jni/x86_64/libgenadb.so` and packages `LICENSE`, `NOTICE` and
`THIRD_PARTY_NOTICES.txt` under `assets/setu-sdk/`. The vendored file contains
all five entries.

The AAR carries no POM, so `:core:setu` also declares the SDK's own
`kotlinx-coroutines-android` 1.10.2 dependency. Apps embedding the SDK must set
`packaging { jniLibs { useLegacyPackaging = true } }` so the agent executable is
extracted; `:app` does.
