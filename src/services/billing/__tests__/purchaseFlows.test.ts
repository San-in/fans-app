import { PRODUCT_IDS } from '@constants'
import { createTestRuntime, type TestRuntime } from '@testing/createTestRuntime'
import { settle, waitFor } from '@testing/waitFor'

const startRuntime = async (options?: Parameters<typeof createTestRuntime>[0]) => {
  const runtime = createTestRuntime(options)
  await waitFor(() => runtime.purchases.getState().productsStatus === 'ready', 'products')
  return runtime
}

const subscribe = async (runtime: TestRuntime) => {
  await runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly)
  await waitFor(() => runtime.access.isAllAccessActive(), 'All Access active')
  await waitFor(() => runtime.purchases.getState().flow.status === 'idle', 'flow idle')
}

describe('purchase flows', () => {
  it('starts a single store flow however many times the button is tapped', async () => {
    const runtime = await startRuntime({ devSettings: { backendConfirmation: 'manual' } })

    const results = await Promise.all([
      runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly),
      runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly),
      runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly),
    ])

    expect(results.filter((result) => result === 'started')).toHaveLength(1)
    expect(runtime.appStore.getLedgerSize()).toBe(1)
    runtime.stop()
  })

  it('treats a cancelled store sheet as a neutral outcome', async () => {
    const runtime = await startRuntime({ devSettings: { storeOutcome: 'cancel' } })

    await runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly)

    expect(runtime.purchases.getState().flow.status).toBe('idle')
    expect(runtime.purchases.getState().lastOutcome?.type).toBe('cancelled')
    expect(runtime.access.isAllAccessActive()).toBe(false)
    expect(runtime.appStore.getLedgerSize()).toBe(0)
    runtime.stop()
  })

  it('keeps valid All Access when an unrelated purchase fails', async () => {
    const runtime = await startRuntime()
    await subscribe(runtime)

    runtime.devSettings.update({ storeOutcome: 'fail' })
    await runtime.purchases.purchase(PRODUCT_IDS.gift)

    expect(runtime.purchases.getState().lastOutcome?.type).toBe('failed')
    expect(runtime.access.isAllAccessActive()).toBe(true)
    await runtime.access.refresh()
    expect(runtime.access.isAllAccessActive()).toBe(true)
    runtime.stop()
  })

  it('applies a repeated store event only once', async () => {
    const runtime = await startRuntime({ devSettings: { repeatEvents: true } })
    await waitFor(() => runtime.chat.getState().hasLoadedInitialPage, 'first page')

    await runtime.purchases.purchase(PRODUCT_IDS.gift)
    await waitFor(
      () => runtime.purchases.getState().lastOutcome?.type === 'purchased',
      'gift confirmed'
    )
    await settle(200)

    const giftMessages = runtime.chat.getState().messages.filter(({ kind }) => kind === 'gift')
    expect(giftMessages).toHaveLength(1)
    expect(runtime.server.getSnapshot().pendingPurchases).toBe(0)
    runtime.stop()
  })

  it('restores a subscription bought on another device', async () => {
    const runtime = await startRuntime()
    runtime.appStore.simulatePurchaseOnAnotherDevice(PRODUCT_IDS.allAccessMonthly, 3)
    expect(runtime.access.isAllAccessActive()).toBe(false)

    await runtime.purchases.restore()

    expect(runtime.purchases.getState().lastOutcome).toEqual({ type: 'restored', count: 1 })
    expect(runtime.access.isAllAccessActive()).toBe(true)
    runtime.stop()
  })

  it('reports an expired subscription on restore without granting access', async () => {
    const runtime = await startRuntime()
    runtime.appStore.simulatePurchaseOnAnotherDevice(PRODUCT_IDS.allAccessMonthly, 45)

    await runtime.purchases.restore()

    expect(runtime.purchases.getState().lastOutcome?.type).toBe('restoredExpired')
    expect(runtime.access.store.getState().status).toBe('expired')
    runtime.stop()
  })
})
