import { PRODUCT_IDS } from '@constants'
import { createTestRuntime } from '@testing/createTestRuntime'
import { settle, waitFor } from '@testing/waitFor'

describe('a store purchase whose backend confirmation is delayed', () => {
  it('shows the purchase as verifying and grants access only once the backend confirms', async () => {
    const runtime = createTestRuntime({ devSettings: { backendConfirmation: 'manual' } })
    await waitFor(() => runtime.purchases.getState().productsStatus === 'ready', 'products')

    await runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly)
    await waitFor(() => runtime.purchases.getState().flow.status === 'verifying', 'verifying')

    // The store has charged, and the app has asked the backend several times by now.
    await settle(80)
    expect(runtime.access.store.getState().status).toBe('free')
    expect(runtime.access.isAllAccessActive()).toBe(false)
    expect(runtime.purchases.getState().pendingTransactions).toHaveLength(1)

    runtime.server.simulateConfirmPendingPurchases()
    await waitFor(() => runtime.access.isAllAccessActive(), 'access granted')
    await waitFor(() => runtime.purchases.getState().flow.status === 'idle', 'flow finished')

    expect(runtime.purchases.getState().lastOutcome).toEqual({
      type: 'purchased',
      productId: PRODUCT_IDS.allAccessMonthly,
    })
    expect(runtime.purchases.getState().pendingTransactions).toHaveLength(0)
    expect(runtime.appStore.getUnfinishedTransactions()).toHaveLength(0)
    runtime.stop()
  })

  it('resumes after a force-quit mid-verification and grants access once', async () => {
    let runtime = createTestRuntime({ devSettings: { backendConfirmation: 'delayed' } })
    await waitFor(() => runtime.purchases.getState().productsStatus === 'ready', 'products')

    await runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly)
    await waitFor(() => runtime.purchases.getState().flow.status === 'verifying', 'verifying')

    runtime = runtime.restart()
    expect(runtime.purchases.getState().flow.status).toBe('verifying')
    expect(runtime.access.isAllAccessActive()).toBe(false)

    await waitFor(() => runtime.access.isAllAccessActive(), 'access granted after restart')
    await waitFor(() => runtime.purchases.getState().flow.status === 'idle', 'flow finished')

    const expiresAt = runtime.server.getSnapshot().allAccessExpiresAt
    await runtime.access.refresh()
    await settle(60)
    // Re-reported transactions after the restart did not extend the subscription again.
    expect(runtime.server.getSnapshot().allAccessExpiresAt).toBe(expiresAt)
    runtime.stop()
  })
})
