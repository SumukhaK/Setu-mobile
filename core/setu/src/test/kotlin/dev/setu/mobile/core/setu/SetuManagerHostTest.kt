package dev.setu.mobile.core.setu

import androidx.test.core.app.ApplicationProvider
import dev.genadb.sdk.ConnectionState
import dev.genadb.sdk.Mode
import dev.genadb.sdk.SetuConfig
import dev.genadb.sdk.SetuManager
import java.io.File
import java.nio.file.Files
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Runs the real SDK reducers against scripted agent output. `SetuManager` is
 * never mocked: its constructor is internal, so a real manager is built with
 * the SDK's injection points (TDD_TICKETS.md §4).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class SetuManagerHostTest {
    private lateinit var scope: CoroutineScope
    private lateinit var stateDir: File

    @Before
    fun setUp() {
        scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        stateDir = Files.createTempDirectory("setu-host").toFile()
    }

    @After
    fun tearDown() {
        scope.cancel()
    }

    private fun host(
        launcher: FakeAgentLauncher,
        policy: FakePolicyProvider = FakePolicyProvider(),
    ): SetuHost = SetuManagerHost(
        SetuManager.Builder(ApplicationProvider.getApplicationContext())
            .agentLauncher(launcher)
            .policyProvider(policy)
            .networkInfoProvider { emptyList() }
            .stateDir(stateDir)
            .scope(scope)
            .build(),
    )

    // P01: a fresh install opens Solo. No managed config, no account, idle, nothing launched yet.
    @Test
    fun p01FreshInstallIsUnmanagedSoloAndIdle() {
        val launcher = FakeAgentLauncher()
        val host = host(launcher)

        val policy = host.policyStatus.value
        assertEquals(Mode.SOLO, policy.mode)
        assertFalse(policy.managed)
        assertNull(policy.missing)
        assertEquals(ConnectionState.Idle, host.connectionState.value)
        assertNull(launcher.launches.poll(200, TimeUnit.MILLISECONDS))
    }

    // Smoke: one launch, then scripted online + pairing_code lines reach Online.
    @Test
    fun startRunsOneAgentAndScriptedEventsReachOnline() = runBlocking {
        val launcher = FakeAgentLauncher()
        val host = host(launcher)

        host.start(SetuConfig(relayUrl = "wss://relay.test/"))
        val agent = launcher.awaitLaunch()
        assertEquals(1, launcher.launchCount)

        agent.emit("""{"event":"online","device_id":"dev-1"}""")
        agent.emit("""{"event":"pairing_code","code":"4321-908172","device_id":"dev-1"}""")

        val online = withTimeout(5_000) {
            host.connectionState.filterIsInstance<ConnectionState.Online>().first { it.pairingCode != null }
        }
        assertEquals(ConnectionState.Online(deviceId = "dev-1", pairingCode = "4321-908172"), online)
        host.stop()
    }

    // AT-02: session_open adds a live session; stop clears the list.
    @Test
    fun sessionsTrackSessionOpenAndClearOnStop() = runBlocking {
        val launcher = FakeAgentLauncher()
        val host = host(launcher)

        host.start(SetuConfig(relayUrl = "wss://relay.test/"))
        val agent = launcher.awaitLaunch()
        agent.emit("""{"event":"online","device_id":"dev-1"}""")
        agent.emit(
            """{"event":"session_open","session_id":"a1","peer_label":"ci-laptop",""" +
                """"transport":"relay-wss","kind":"adb"}""",
        )

        val sessions = withTimeout(5_000) { host.sessions.first { it.isNotEmpty() } }
        assertEquals(1, sessions.size)
        assertEquals("a1", sessions[0].id)
        assertEquals("ci-laptop", sessions[0].peerLabel)

        host.stop()
        assertTrue(host.sessions.value.isEmpty())
    }

    // Stop: the agent process is destroyed and the SDK reports Idle again.
    @Test
    fun stopDestroysTheAgentAndReturnsToIdle() = runBlocking {
        val launcher = FakeAgentLauncher()
        val host = host(launcher)

        host.start(SetuConfig(relayUrl = "wss://relay.test/"))
        val agent = launcher.awaitLaunch()
        agent.emit("""{"event":"online","device_id":"dev-1"}""")
        withTimeout(5_000) { host.connectionState.first { it is ConnectionState.Online } }

        host.stop()

        assertTrue(agent.destroyed)
        assertEquals(ConnectionState.Idle, host.connectionState.value)
    }
}
