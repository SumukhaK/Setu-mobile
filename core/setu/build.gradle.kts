import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "dev.setu.mobile.core.setu"
    compileSdk = 35

    defaultConfig {
        minSdk = 29
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    lint {
        warningsAsErrors = true
        abortOnError = true
        // AD-8 pins the toolchain to the Setu SDK build, so "a newer version is
        // available" advisories (and OldTargetApi against a newer installed SDK)
        // would fail every build as releases appear. Code checks stay on.
        disable += setOf("GradleDependency", "AndroidGradlePluginVersion", "OldTargetApi")
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    // AD-5: the official 1.1.0 AAR is vendored; a file AAR carries no POM, so
    // the SDK's own coroutines dependency is declared here explicitly.
    api(files("../../third_party/setu-android/setu-android-1.1.0.aar"))
    api(libs.kotlinx.coroutines.android)

    testImplementation(libs.androidx.test.core)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.robolectric)
    testImplementation(libs.turbine)
}
