import { ALL_ACCESS_PERIOD_MS } from '@constants'
import { findCatalogProduct } from '@mock/appStore/catalog'
import type { DevSettingsStore } from '@mock/devSettings/DevSettingsStore'
import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type {
  AccessDto,
  QuotaDto,
  RestorePurchasesResponse,
  StoreTransaction,
  VerifyPurchaseResponse,
} from '@types'

import type { RealtimeHub } from './RealtimeHub'
import { isReceiptValid } from './receipt'

const BILLING_KEY = 'billing.v1'

type ProcessedTransaction = Omit<StoreTransaction, 'receipt'> & {
  status: 'pending' | 'confirmed' | 'rejected'
  /** When a pending confirmation is due; null means it waits for a manual confirm. */
  confirmAt: number | null
  rejectionReason: string | null
}

type Entitlement = {
  productId: string
  originalTransactionId: string
  expiresAt: number
}

type ServerBillingSnapshot = {
  transactions: Record<string, ProcessedTransaction>
  entitlement: Entitlement | null
}

type ServerBillingDependencies = {
  storage: KeyValueStorage
  hub: RealtimeHub
  devSettings: DevSettingsStore
  now: () => number
  confirmationDelayMs: number
  getQuota: () => QuotaDto
  postGiftMessage: (clientId: string, text: string) => void
}

type VerifyMode = 'purchase' | 'restore'

/**
 * Backend half of billing. Purchase results from the store are only claims;
 * access exists once this service has validated the receipt and applied the
 * transaction — exactly once per transactionId, however often it is reported.
 */
export class ServerBilling {
  private snapshot: ServerBillingSnapshot
  private readonly confirmationTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(private readonly deps: ServerBillingDependencies) {
    this.snapshot = readJson<ServerBillingSnapshot>(deps.storage, BILLING_KEY, {
      transactions: {},
      entitlement: null,
    })
  }

  /** Server timers die with the app process, so due confirmations are resumed from disk. */
  public start(): void {
    Object.values(this.snapshot.transactions).forEach((transaction) => {
      if (transaction.status === 'pending' && transaction.confirmAt !== null) {
        this.scheduleConfirmation(transaction.transactionId, transaction.confirmAt)
      }
    })
  }

  public stop(): void {
    this.confirmationTimers.forEach((timerId) => clearTimeout(timerId))
    this.confirmationTimers.clear()
  }

  public hasActiveAllAccess(): boolean {
    const { entitlement } = this.snapshot
    return Boolean(entitlement) && (entitlement?.expiresAt ?? 0) > this.deps.now()
  }

  public getAccess(): AccessDto {
    const { entitlement } = this.snapshot
    return {
      allAccess: entitlement
        ? {
            ...entitlement,
            status: entitlement.expiresAt > this.deps.now() ? 'active' : 'expired',
          }
        : null,
      quota: this.deps.getQuota(),
    }
  }

  public verify(
    transaction: StoreTransaction,
    mode: VerifyMode = 'purchase'
  ): VerifyPurchaseResponse {
    const existing = this.snapshot.transactions[transaction.transactionId]
    if (existing) {
      return this.toVerifyResponse(existing)
    }

    const { receipt: _receipt, ...fields } = transaction
    const product = findCatalogProduct(transaction.productId)
    if (!product || !isReceiptValid(transaction)) {
      return this.record({
        ...fields,
        status: 'rejected',
        confirmAt: null,
        rejectionReason: 'This receipt could not be validated.',
      })
    }

    // Restores are validated synchronously against the store's records; the
    // configurable delay models how long a *new* purchase takes to propagate.
    const setting =
      mode === 'restore' ? 'instant' : this.deps.devSettings.getState().backendConfirmation
    if (setting === 'reject') {
      return this.record({
        ...fields,
        status: 'rejected',
        confirmAt: null,
        rejectionReason: 'The store reported this purchase as invalid.',
      })
    }

    const now = this.deps.now()
    const confirmAt =
      setting === 'manual'
        ? null
        : now + (setting === 'delayed' ? this.deps.confirmationDelayMs : 0)
    this.record({ ...fields, status: 'pending', confirmAt, rejectionReason: null })

    if (setting === 'instant') {
      this.confirm(transaction.transactionId)
    } else if (confirmAt !== null) {
      this.scheduleConfirmation(transaction.transactionId, confirmAt)
    }
    return this.toVerifyResponse(this.getTransaction(transaction.transactionId))
  }

  public restore(transactions: ReadonlyArray<StoreTransaction>): RestorePurchasesResponse {
    const restoredCount = transactions
      .filter(({ productId }) => findCatalogProduct(productId)?.type === 'subscription')
      .map((transaction) => this.verify(transaction, 'restore'))
      .filter(({ status }) => status === 'confirmed').length

    return { access: this.getAccess(), restoredCount }
  }

  /** Simulation hook for the "manual" confirmation mode. */
  public confirmAllPending(): number {
    const pendingIds = Object.values(this.snapshot.transactions)
      .filter(({ status }) => status === 'pending')
      .map(({ transactionId }) => transactionId)
    pendingIds.forEach((transactionId) => this.confirm(transactionId))
    return pendingIds.length
  }

  /** Simulation hook: what a renewal failure or an App Store refund ends in. */
  public expireAllAccess(): void {
    const { entitlement } = this.snapshot
    if (!entitlement) {
      return
    }
    this.snapshot = {
      ...this.snapshot,
      entitlement: { ...entitlement, expiresAt: this.deps.now() - 1 },
    }
    this.persist()
    this.deps.hub.publish({ type: 'access.updated' })
  }

  public countPending(): number {
    return Object.values(this.snapshot.transactions).filter(({ status }) => status === 'pending')
      .length
  }

  public getEntitlementExpiresAt(): number | null {
    return this.snapshot.entitlement?.expiresAt ?? null
  }

  private confirm(transactionId: string): void {
    const transaction = this.snapshot.transactions[transactionId]
    // The status check is what makes a confirmation apply its effect exactly once.
    if (!transaction || transaction.status !== 'pending') {
      return
    }
    const product = findCatalogProduct(transaction.productId)
    this.confirmationTimers.delete(transactionId)

    let { entitlement } = this.snapshot
    if (product?.type === 'subscription') {
      // A renewal bought while still active extends from the current expiry.
      const periodStart = Math.max(transaction.purchasedAt, entitlement?.expiresAt ?? 0)
      entitlement = {
        productId: transaction.productId,
        originalTransactionId: transaction.originalTransactionId,
        expiresAt: periodStart + ALL_ACCESS_PERIOD_MS,
      }
    }

    this.snapshot = {
      entitlement,
      transactions: {
        ...this.snapshot.transactions,
        [transactionId]: { ...transaction, status: 'confirmed', confirmAt: null },
      },
    }
    this.persist()

    if (product?.type === 'consumable') {
      this.deps.postGiftMessage(`gift:${transactionId}`, `You sent a ${product.displayPrice} gift!`)
    }
    this.deps.hub.publish({ type: 'access.updated' })
  }

  private scheduleConfirmation(transactionId: string, confirmAt: number): void {
    const existingTimer = this.confirmationTimers.get(transactionId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    const timerId = setTimeout(
      () => this.confirm(transactionId),
      Math.max(0, confirmAt - this.deps.now())
    )
    this.confirmationTimers.set(transactionId, timerId)
  }

  private record(transaction: ProcessedTransaction): VerifyPurchaseResponse {
    this.snapshot = {
      ...this.snapshot,
      transactions: { ...this.snapshot.transactions, [transaction.transactionId]: transaction },
    }
    this.persist()
    return this.toVerifyResponse(transaction)
  }

  private getTransaction(transactionId: string): ProcessedTransaction {
    const transaction = this.snapshot.transactions[transactionId]
    if (!transaction) {
      throw new Error(`Unknown transaction ${transactionId}`)
    }
    return transaction
  }

  private toVerifyResponse({
    status,
    rejectionReason,
  }: ProcessedTransaction): VerifyPurchaseResponse {
    switch (status) {
      case 'confirmed':
        return { status: 'confirmed', access: this.getAccess() }
      case 'rejected':
        return { status: 'rejected', reason: rejectionReason ?? 'Purchase rejected.' }
      case 'pending':
        return { status: 'pending' }
    }
  }

  private persist(): void {
    writeJson(this.deps.storage, BILLING_KEY, this.snapshot)
  }
}
