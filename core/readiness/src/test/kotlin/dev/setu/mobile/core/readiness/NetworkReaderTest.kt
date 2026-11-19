package dev.setu.mobile.core.readiness

import android.app.Application
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkInfo
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowNetworkCapabilities
import org.robolectric.shadows.ShadowNetworkInfo

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class NetworkReaderTest {
    private val app: Application get() = ApplicationProvider.getApplicationContext()

    // P04: Wi-Fi is decided from the active network's transport only.
    @Test
    fun onWifiWhenTheActiveNetworkIsWifi() {
        val manager = activeNetwork(ConnectivityManager.TYPE_WIFI, NetworkCapabilities.TRANSPORT_WIFI)

        assertTrue(NetworkReader(app).onWifi())
        assertTrue(manager.activeNetwork != null)
    }

    @Test
    fun offWifiWhenTheActiveNetworkIsCellular() {
        activeNetwork(ConnectivityManager.TYPE_MOBILE, NetworkCapabilities.TRANSPORT_CELLULAR)

        assertFalse(NetworkReader(app).onWifi())
    }

    @Test
    fun offWifiWhenThereIsNoActiveNetwork() {
        val manager = app.getSystemService(ConnectivityManager::class.java)
        shadowOf(manager).setActiveNetworkInfo(null)

        assertFalse(NetworkReader(app).onWifi())
    }

    private fun activeNetwork(type: Int, transport: Int): ConnectivityManager {
        val manager = app.getSystemService(ConnectivityManager::class.java)
        val shadow = shadowOf(manager)
        val info = ShadowNetworkInfo.newInstance(NetworkInfo.DetailedState.CONNECTED, type, 0, true, true)
        shadow.setActiveNetworkInfo(info)
        val capabilities = ShadowNetworkCapabilities.newInstance()
        shadowOf(capabilities).addTransportType(transport)
        shadow.setNetworkCapabilities(requireNotNull(manager.activeNetwork), capabilities)
        return manager
    }
}
