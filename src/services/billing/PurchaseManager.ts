import type { MockAppStore } from '@mock/appStore/MockAppStore'
import type { AccessService } from '@services/access/AccessService'
import type { ServerApi } from '@services/api/createServerApi'
import type { RealtimeClient } from '@services/realtime/RealtimeClient'
import type { RuntimeConfig } from '@services/runtime/config'
import type { KeyValueStorage } from '@services/storage'
import type {
  PendingTransaction,
  PurchaseFlow,
  PurchaseOutcome,
  PurchaseStartResult,
  StoreProduct,
  StorePurchaseResult,
  StoreTransaction,
} from '@types'
import { isApiError } from '@types'
import { createStore, type StoreApi } from 'zustand/vanilla'

import { PendingTransactionsRepository } from './PendingTransactionsRepository'

export type PurchasesState = {
  products: ReadonlyArray<StoreProduct>
  productsStatus: 'idle' | 'loading' | 'ready' | 'error'
  flow: PurchaseFlow
  lastOutcome: PurchaseOutcome | null
  pendingTransactions: ReadonlyArray<PendingTransaction>
}

type Connectivity = {
  isOnline: () => boolean
  subscribe: (listener: (isOnline: boolean) => void) => () => void
}

type PurchaseManagerDependencies = {
  appStore: MockAppStore
  api: ServerApi
  access: AccessService
  realtime: RealtimeClient
  connectivity: Connectivity
  storage: KeyValueStorage
  config: RuntimeConfig
  now: () => number
}

const toStoreTransaction = ({
  firstSeenAt: _firstSeenAt,
  lastError: _lastError,
  ...transaction
}: PendingTransaction): StoreTransaction => transaction

const describeError = (error: unknown) => {
  if (isApiError(error) && error.code === 'NETWORK_OFFLINE') {
    return 'Waiting for a connection to confirm your purchase.'
  }
  return 'Couldn’t reach FanSuite to confirm yet. Retrying automatically.'
}

/**
 * Runs the paywall flows. A store result is only the first half of a
 * purchase: it goes into a persisted pending list and access changes only
 * when the backend confirms it (via `AccessService.apply`). Every path that
 * reports a transaction — the purchase call, store update events, unfinished
 * transactions at launch — funnels into `handleTransaction`, keyed by
 * transactionId, so repeats cannot start a second verification or effect.
 */
export class PurchaseManager {
  public readonly store: StoreApi<PurchasesState>
  private readonly repository: PendingTransactionsRepository
  /** Synchronous guard: two taps in the same frame must not open two store sheets. */
  private isFlowLocked = false
  private readonly verifyingTransactionIds = new Set<string>()
  private readonly finishedTransactionIds = new Set<string>()
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private isRunning = false
  private unsubscribers: Array<() => void> = []

  constructor(private readonly deps: PurchaseManagerDependencies) {
    this.repository = new PendingTransactionsRepository(deps.storage)
    this.store = createStore<PurchasesState>(() => ({
      products: [],
      productsStatus: 'idle',
      flow: { status: 'idle' },
      lastOutcome: null,
      pendingTransactions: [],
    }))
  }

  public start(): void {
    if (this.isRunning) {
      return
    }
    this.isRunning = true
    const pendingTransactions = this.repository.load()
    const [oldestPending] = pendingTransactions
    this.store.setState({ pendingTransactions })
    if (oldestPending) {
      // A purchase from a previous session is still unconfirmed: resume showing it as such.
      this.isFlowLocked = true
      this.store.setState({
        flow: {
          status: 'verifying',
          productId: oldestPending.productId,
          transactionId: oldestPending.transactionId,
        },
      })
    }

    this.unsubscribers = [
      this.deps.appStore.subscribe((transaction) => this.handleTransaction(transaction)),
      this.deps.connectivity.subscribe((isOnline) => {
        if (isOnline) {
          this.verifyAllPending()
        }
      }),
      this.deps.realtime.onEvent((event) => {
        if (event.type === 'access.updated') {
          this.verifyAllPending()
        }
      }),
    ]

    // StoreKit / Play redeliver unfinished transactions on launch; so does the mock.
    this.deps.appStore
      .getUnfinishedTransactions()
      .forEach((transaction) => this.handleTransaction(transaction))
    this.verifyAllPending()
    void this.loadProducts()
  }

  public stop(): void {
    this.isRunning = false
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []
    this.clearPoll()
  }

  public getState(): PurchasesState {
    return this.store.getState()
  }

  public async loadProducts(): Promise<void> {
    if (this.store.getState().productsStatus === 'loading') {
      return
    }
    this.store.setState({ productsStatus: 'loading' })
    try {
      const products = await this.deps.appStore.getProducts()
      if (this.isRunning) {
        this.store.setState({ products, productsStatus: 'ready' })
      }
    } catch {
      if (this.isRunning) {
        this.store.setState({ productsStatus: 'error' })
      }
    }
  }

  public async purchase(productId: string): Promise<PurchaseStartResult> {
    if (this.isFlowLocked) {
      return 'ignoredBusy'
    }
    const product = this.store.getState().products.find(({ id }) => id === productId)
    if (product?.type === 'subscription' && this.deps.access.isAllAccessActive()) {
      return 'alreadyActive'
    }

    this.isFlowLocked = true
    this.store.setState({ flow: { status: 'purchasing', productId }, lastOutcome: null })

    let result: StorePurchaseResult
    try {
      result = await this.deps.appStore.purchase(productId)
    } catch {
      result = { status: 'failed', message: 'The store is unavailable right now.' }
    }
    if (!this.isRunning) {
      return 'started'
    }

    switch (result.status) {
      case 'cancelled':
        this.finishFlow({ type: 'cancelled', productId })
        break
      case 'failed':
        // Deliberately touches nothing but the flow: existing access stays exactly as it was.
        this.finishFlow({ type: 'failed', productId, message: result.message })
        break
      case 'success':
        this.handleTransaction(result.transaction)
        break
    }
    return 'started'
  }

  public async restore(): Promise<void> {
    if (this.isFlowLocked) {
      return
    }
    this.isFlowLocked = true
    this.store.setState({ flow: { status: 'restoring' }, lastOutcome: null })

    try {
      const transactions = await this.deps.appStore.restorePurchases()
      if (!this.isRunning) {
        return
      }
      if (transactions.length === 0) {
        this.finishFlow({ type: 'nothingToRestore' })
        return
      }
      const { access, restoredCount } = await this.deps.api.restorePurchases(transactions)
      if (!this.isRunning) {
        return
      }
      this.deps.access.apply(access)
      if (access.allAccess?.status === 'active') {
        this.finishFlow({ type: 'restored', count: restoredCount })
      } else if (access.allAccess?.status === 'expired') {
        this.finishFlow({ type: 'restoredExpired' })
      } else {
        this.finishFlow({ type: 'nothingToRestore' })
      }
    } catch (error) {
      if (this.isRunning) {
        this.finishFlow({
          type: 'restoreFailed',
          message:
            isApiError(error) && error.code === 'NETWORK_OFFLINE'
              ? 'You’re offline. Connect and try restoring again.'
              : 'Couldn’t restore purchases. Try again in a moment.',
        })
      }
    }
  }

  public dismissOutcome(): void {
    this.store.setState({ lastOutcome: null })
  }

  private handleTransaction(transaction: StoreTransaction): void {
    if (!this.isRunning || this.finishedTransactionIds.has(transaction.transactionId)) {
      return
    }
    const { pendingTransactions, flow } = this.store.getState()
    const isKnown = pendingTransactions.some(
      ({ transactionId }) => transactionId === transaction.transactionId
    )
    if (!isKnown) {
      const nextPending = [
        ...pendingTransactions,
        { ...transaction, firstSeenAt: this.deps.now(), lastError: null },
      ]
      // Persist before verifying: a kill mid-verification must not lose a paid transaction.
      this.repository.save(nextPending)
      this.store.setState({ pendingTransactions: nextPending })
    }

    if (flow.status === 'idle' || flow.status === 'purchasing') {
      this.isFlowLocked = true
      this.store.setState({
        flow: {
          status: 'verifying',
          productId: transaction.productId,
          transactionId: transaction.transactionId,
        },
      })
    }
    void this.verifyTransaction(transaction.transactionId)
  }

  private verifyAllPending(): void {
    this.store
      .getState()
      .pendingTransactions.forEach(
        ({ transactionId }) => void this.verifyTransaction(transactionId)
      )
  }

  private async verifyTransaction(transactionId: string): Promise<void> {
    const pending = this.store
      .getState()
      .pendingTransactions.find((transaction) => transaction.transactionId === transactionId)
    if (!pending || this.verifyingTransactionIds.has(transactionId)) {
      return
    }
    this.verifyingTransactionIds.add(transactionId)
    try {
      const response = await this.deps.api.verifyPurchase(toStoreTransaction(pending))
      if (!this.isRunning) {
        return
      }
      switch (response.status) {
        case 'confirmed':
          // The only place a purchase turns into access.
          this.deps.access.apply(response.access)
          this.completeTransaction(transactionId, {
            type: 'purchased',
            productId: pending.productId,
          })
          break
        case 'rejected':
          this.completeTransaction(transactionId, {
            type: 'rejected',
            productId: pending.productId,
            message: response.reason,
          })
          break
        case 'pending':
          this.schedulePoll()
          break
      }
    } catch (error) {
      if (this.isRunning) {
        this.patchPending(transactionId, { lastError: describeError(error) })
        this.schedulePoll()
      }
    } finally {
      this.verifyingTransactionIds.delete(transactionId)
    }
  }

  private completeTransaction(transactionId: string, outcome: PurchaseOutcome): void {
    this.deps.appStore.finishTransaction(transactionId)
    this.finishedTransactionIds.add(transactionId)
    const nextPending = this.store
      .getState()
      .pendingTransactions.filter((transaction) => transaction.transactionId !== transactionId)
    this.repository.save(nextPending)
    this.store.setState({ pendingTransactions: nextPending })

    const { flow } = this.store.getState()
    if (flow.status === 'verifying' && flow.transactionId === transactionId) {
      this.finishFlow(outcome)
    }
  }

  private finishFlow(outcome: PurchaseOutcome): void {
    const nextPending = this.store.getState().pendingTransactions[0]
    if (nextPending) {
      // Another transaction still awaits confirmation; keep the paywall honest about it.
      this.store.setState({
        flow: {
          status: 'verifying',
          productId: nextPending.productId,
          transactionId: nextPending.transactionId,
        },
        lastOutcome: outcome,
      })
      return
    }
    this.isFlowLocked = false
    this.store.setState({ flow: { status: 'idle' }, lastOutcome: outcome })
  }

  private patchPending(transactionId: string, patch: Partial<PendingTransaction>): void {
    const nextPending = this.store
      .getState()
      .pendingTransactions.map((transaction) =>
        transaction.transactionId === transactionId ? { ...transaction, ...patch } : transaction
      )
    this.repository.save(nextPending)
    this.store.setState({ pendingTransactions: nextPending })
  }

  private schedulePoll(): void {
    if (this.pollTimer || !this.isRunning) {
      return
    }
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null
      if (this.deps.connectivity.isOnline()) {
        this.verifyAllPending()
      }
    }, this.deps.config.purchasePollIntervalMs)
  }

  private clearPoll(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }
}
