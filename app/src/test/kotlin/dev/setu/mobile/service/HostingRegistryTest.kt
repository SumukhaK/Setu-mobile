package dev.setu.mobile.service

import android.app.Application
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import dev.genadb.sdk.ConnectionState
import dev.setu.mobile.core.setu.SetuHost
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class HostingRegistryTest {
    private val app: Application get() = ApplicationProvider.getApplicationContext()
    private val fake = FakeSetuHost()
    private val other = FakeSetuHost()

    @Before
    fun setUp() {
        // Replace any host left attached by another test class, then clear it.
        HostingRegistry.attach(fake)
        HostingRegistry.detach(fake)
    }

    @After
    fun tearDown() {
        HostingRegistry.detach(fake)
        HostingRegistry.detach(other)
    }

    // P17: with no host attached the registry is Idle.
    @Test
    fun p17IdleWithoutAnAttachedHost() {
        assertEquals(ConnectionState.Idle, HostingRegistry.connectionState.value)
    }

    // AD-15: the attached host's live state shows through.
    @Test
    fun p17AttachedHostStateShowsThrough() {
        HostingRegistry.attach(fake)
        val online = ConnectionState.Online(deviceId = "dev-1", pairingCode = "1234-567890")
        fake.connectionState.value = online

        assertEquals(online, HostingRegistry.connectionState.value)
    }

    // AD-15: detaching returns the flow to Idle.
    @Test
    fun p17DetachReturnsToIdle() {
        HostingRegistry.attach(fake)
        fake.connectionState.value = ConnectionState.Online(deviceId = "dev-1")

        HostingRegistry.detach(fake)

        assertEquals(ConnectionState.Idle, HostingRegistry.connectionState.value)
    }

    // AD-15: detaching a different host does nothing.
    @Test
    fun p17DetachingAnotherHostIsANoOp() {
        HostingRegistry.attach(fake)
        val online = ConnectionState.Online(deviceId = "dev-1")
        fake.connectionState.value = online

        HostingRegistry.detach(other)

        assertEquals(online, HostingRegistry.connectionState.value)
    }

    // AD-15: pair() delegates to the attached host and fails when none is attached.
    @Test
    fun p17PairDelegatesToTheAttachedHost() {
        runBlocking {
            HostingRegistry.attach(fake)
            fake.pairResult = "9999-000000"
            assertEquals("9999-000000", HostingRegistry.pair())
            assertEquals(1, fake.pairCount)

            HostingRegistry.detach(fake)
            val error = runCatching { HostingRegistry.pair() }.exceptionOrNull()
            assertNotNull(error)
            assertEquals("not hosting", error?.message)
        }
    }

    // AD-15 / P17: the service attaches after createHost and detaches in onDestroy.
    @Test
    fun p17ServiceAttachesAndDetachesItsHost() {
        RegistryTestHostingService.host = fake
        val controller = Robolectric.buildService(
            RegistryTestHostingService::class.java,
            Intent(app, RegistryTestHostingService::class.java),
        ).create()

        val online = ConnectionState.Online(deviceId = "dev-1")
        fake.connectionState.value = online
        assertEquals(online, HostingRegistry.connectionState.value)

        controller.destroy()
        assertEquals(ConnectionState.Idle, HostingRegistry.connectionState.value)
    }

    /** Mirrors HostingServiceTest's seam; the registry must follow the real lifecycle. */
    private class RegistryTestHostingService : HostingService() {
        override fun createHost(): SetuHost = host

        companion object {
            lateinit var host: SetuHost
        }
    }
}
