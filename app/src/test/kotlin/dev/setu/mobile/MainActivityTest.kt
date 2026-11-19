package dev.setu.mobile

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** P01, phone: a fresh install shows Setu and no account, sign-in or approval UI. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class MainActivityTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun p01ShowsSetuWithoutAccountOrApprovalUi() {
        compose.onNodeWithText("Setu").assertExists()

        listOf("Sign in", "Account", "Approve", "Email").forEach { forbidden ->
            compose.onAllNodes(hasText(forbidden, substring = true, ignoreCase = true))
                .assertCountEquals(0)
        }
    }
}
