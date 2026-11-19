package dev.setu.mobile.core.setu

import dev.genadb.sdk.AgentLauncher
import dev.genadb.sdk.AgentProcess
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/**
 * Scripted agent process, mirroring the SDK's own `FakeAgent` (Setu tag
 * `v1.1.0`): tests push agent JSON lines and exit codes, and the real SDK
 * reducers run against them.
 */
class FakeAgentLauncher : AgentLauncher {
    val launches = LinkedBlockingQueue<List<String>>()

    @Volatile
    var current: FakeAgentProcess? = null
        private set

    @Volatile
    var launchCount: Int = 0
        private set

    override fun launch(args: List<String>, env: Map<String, String>): AgentProcess {
        val process = FakeAgentProcess()
        current = process
        launchCount++
        launches.put(args)
        return process
    }

    /** Waits for the next launch and returns its process. */
    fun awaitLaunch(): FakeAgentProcess {
        launches.poll(5, TimeUnit.SECONDS) ?: error("agent not launched")
        return checkNotNull(current)
    }
}

/** A scripted agent's stdout queue: [emit] appends a line, [exit] ends the stream. */
class FakeAgentProcess : AgentProcess {
    private val lines = LinkedBlockingQueue<String>()

    @Volatile
    var exitCode: Int? = null
        private set

    @Volatile
    var destroyed: Boolean = false
        private set

    fun emit(json: String) {
        lines.put(json)
    }

    fun exit(code: Int) {
        exitCode = code
        lines.put(EOF)
    }

    override fun readLine(): String? {
        var next: String? = null
        while (next == null && !destroyed) {
            val line = lines.poll(20, TimeUnit.MILLISECONDS)
            if (line == EOF) return null
            next = line
        }
        return next
    }

    override fun waitFor(): Int = exitCode ?: if (destroyed) 143 else 0

    override fun destroy() {
        destroyed = true
    }

    private companion object {
        const val EOF = "\u0000EOF"
    }
}
