package dev.setu.mobile.core.readiness

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RecheckOnResumeTest {
    // P04/J2: returning from Settings re-reads readiness on every resume.
    @Test
    fun rechecksEveryTimeTheOwnerResumes() {
        var calls = 0
        val owner = TestOwner()
        owner.lifecycle.addObserver(RecheckOnResume { calls += 1 })

        owner.registry.currentState = Lifecycle.State.RESUMED
        owner.registry.currentState = Lifecycle.State.STARTED
        owner.registry.currentState = Lifecycle.State.RESUMED

        assertEquals(2, calls)
    }

    private class TestOwner : LifecycleOwner {
        val registry = LifecycleRegistry(this)
        override val lifecycle: Lifecycle get() = registry
    }
}
