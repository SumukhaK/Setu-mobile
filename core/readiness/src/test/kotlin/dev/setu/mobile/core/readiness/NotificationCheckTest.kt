package dev.setu.mobile.core.readiness

import android.Manifest
import android.app.Application
import android.app.NotificationManager
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class NotificationCheckTest {
    private val app: Application get() = ApplicationProvider.getApplicationContext()

    // P06/P04: Android 13+ reports the runtime permission.
    @Test
    fun grantedWhenPermissionIsGranted() {
        shadowOf(app).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)

        assertEquals(Tri.YES, NotificationCheck(app).granted())
    }

    @Test
    fun deniedWhenPermissionIsDenied() {
        shadowOf(app).denyPermissions(Manifest.permission.POST_NOTIFICATIONS)

        assertEquals(Tri.NO, NotificationCheck(app).granted())
    }

    // P06: below 33 the app-level notification switch is the signal.
    @Config(sdk = [29])
    @Test
    fun deniedWhenNotificationsAreDisabledBelowThirtyThree() {
        val manager = app.getSystemService(NotificationManager::class.java)
        shadowOf(manager).setNotificationsEnabled(false)

        assertEquals(Tri.NO, NotificationCheck(app).granted())
    }
}
