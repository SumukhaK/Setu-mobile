package dev.setu.mobile.core.setu

import dev.genadb.sdk.ManagedPolicy
import dev.genadb.sdk.PolicyProvider

/** Supplies test managed configuration; defaults to an unmanaged device. */
class FakePolicyProvider(var policy: ManagedPolicy = ManagedPolicy()) : PolicyProvider {
    override fun current(): ManagedPolicy = policy
}
