package dev.setu.mobile.feature.host

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.genadb.sdk.ConnectionState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.math.ceil

interface HostingActions {
    fun start()
    fun stop()
    suspend fun pair(): String
}

data class HostUiState(
    val status: HostStatus,
    val deviceId: String?,
    val pairingCode: String?,
    val warning: String?,
    val canStart: Boolean,
    val canStop: Boolean,
    val message: HostMessage?,
)

enum class HostStatus { IDLE, STARTING, ONLINE, RECONNECTING, BLOCKED, POLICY_MISSING }

sealed interface HostMessage {
    data object NoRelay : HostMessage
    data object PairFailed : HostMessage
    data class RetryIn(val seconds: Long) : HostMessage
}

/** UI state only: all decisions come from the SDK state and the relay flag. */
class HostViewModel(
    connectionState: StateFlow<ConnectionState>,
    private val actions: HostingActions,
    private val relayConfigured: Boolean,
) : ViewModel() {
    private val pairFailure = MutableStateFlow<HostMessage?>(null)
    private var consumeFailure = false

    val uiState: StateFlow<HostUiState> = combine(connectionState, pairFailure) { state, failure ->
        val message = when {
            state is ConnectionState.Idle && !relayConfigured -> HostMessage.NoRelay
            state is ConnectionState.Reconnecting && state.retryInMs >= 0 -> retryMessage(state)
            consumeFailure -> {
                consumeFailure = false
                failure
            }
            else -> null
        }
        uiStateOf(state, message)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = uiStateOf(connectionState.value, initialMessage(connectionState.value)),
    )

    fun start() = actions.start()

    fun stop() = actions.stop()

    fun newCode() {
        viewModelScope.launch {
            try {
                // The displayed code always comes from Online.pairingCode (P03).
                actions.pair()
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (expected: Throwable) {
                consumeFailure = true
                pairFailure.value = HostMessage.PairFailed
            }
        }
    }

    private fun initialMessage(state: ConnectionState): HostMessage? = when {
        state is ConnectionState.Idle && !relayConfigured -> HostMessage.NoRelay
        state is ConnectionState.Reconnecting && state.retryInMs >= 0 -> retryMessage(state)
        else -> null
    }

    private fun retryMessage(state: ConnectionState.Reconnecting): HostMessage =
        HostMessage.RetryIn(ceil(state.retryInMs / MILLIS_PER_SECOND).toLong())

    private fun uiStateOf(state: ConnectionState, message: HostMessage?): HostUiState {
        val status = when (state) {
            ConnectionState.Idle -> HostStatus.IDLE
            ConnectionState.Starting -> HostStatus.STARTING
            is ConnectionState.Online -> HostStatus.ONLINE
            is ConnectionState.Reconnecting -> HostStatus.RECONNECTING
            is ConnectionState.Blocked -> HostStatus.BLOCKED
            is ConnectionState.PolicyMissing -> HostStatus.POLICY_MISSING
        }
        return HostUiState(
            status = status,
            deviceId = (state as? ConnectionState.Online)?.deviceId,
            pairingCode = (state as? ConnectionState.Online)?.pairingCode,
            warning = (state as? ConnectionState.Online)?.warning,
            canStart = status == HostStatus.IDLE && relayConfigured,
            canStop = status != HostStatus.IDLE,
            message = message,
        )
    }
}

private const val MILLIS_PER_SECOND = 1000.0
