import type { DevSettingsStore } from '@mock/devSettings/DevSettingsStore'
import { signReceipt } from '@mock/server/receipt'
import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type { StoreProduct, StorePurchaseResult, StoreTransaction } from '@types'
import { delay } from '@utils'

import { findCatalogProduct, STORE_CATALOG } from './catalog'

const LEDGER_KEY = 'ledger.v1'
const PRODUCTS_DELAY_MS = 150
const RESTORE_DELAY_MS = 700
const REPEATED_EVENT_DELAY_MS = 80
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000

type LedgerEntry = StoreTransaction & { isFinished: boolean }

type MockAppStoreDependencies = {
  storage: KeyValueStorage
  devSettings: DevSettingsStore
  now: () => number
  createId: () => string
  sheetDelayMs: number
}

/**
 * Stands in for StoreKit / Play Billing: it charges, keeps the account's
 * purchase ledger, and redelivers unfinished transactions until the app
 * finishes them. It knows nothing about the backend or about access.
 */
export class MockAppStore {
  private ledger: Array<LedgerEntry>
  private readonly listeners = new Set<(transaction: StoreTransaction) => void>()
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(private readonly deps: MockAppStoreDependencies) {
    this.ledger = readJson<Array<LedgerEntry>>(deps.storage, LEDGER_KEY, [])
  }

  public async getProducts(): Promise<ReadonlyArray<StoreProduct>> {
    await delay(PRODUCTS_DELAY_MS)
    return STORE_CATALOG
  }

  public async purchase(productId: string): Promise<StorePurchaseResult> {
    await delay(this.deps.sheetDelayMs)
    const product = findCatalogProduct(productId)
    const { storeOutcome, repeatEvents } = this.deps.devSettings.getState()

    if (storeOutcome === 'cancel') {
      return { status: 'cancelled' }
    }
    if (storeOutcome === 'fail' || !product) {
      return { status: 'failed', message: 'Your payment was declined by the store.' }
    }

    const previousSubscription =
      product.type === 'subscription'
        ? this.ledger.find((entry) => entry.productId === productId)
        : undefined
    const transactionId = `txn_${this.deps.createId()}`
    const fields = {
      transactionId,
      originalTransactionId: previousSubscription?.originalTransactionId ?? transactionId,
      productId,
      purchasedAt: this.deps.now(),
    }
    const transaction: StoreTransaction = { ...fields, receipt: signReceipt(fields) }

    this.ledger = [...this.ledger, { ...transaction, isFinished: false }]
    this.persist()

    // Like `Transaction.updates` / `purchasesUpdatedListener`: the app hears
    // about the transaction here *and* from the purchase call's result.
    this.emit(transaction)
    if (repeatEvents) {
      this.emitLater(transaction, REPEATED_EVENT_DELAY_MS)
    }
    return { status: 'success', transaction }
  }

  public getUnfinishedTransactions(): Array<StoreTransaction> {
    return this.ledger.filter(({ isFinished }) => !isFinished).map(this.toTransaction)
  }

  public finishTransaction(transactionId: string): void {
    this.ledger = this.ledger.map((entry) =>
      entry.transactionId === transactionId ? { ...entry, isFinished: true } : entry
    )
    this.persist()
  }

  /** Subscriptions only: consumables are not restorable. */
  public async restorePurchases(): Promise<Array<StoreTransaction>> {
    await delay(RESTORE_DELAY_MS)
    return this.ledger
      .filter(({ productId }) => findCatalogProduct(productId)?.type === 'subscription')
      .map(this.toTransaction)
  }

  public subscribe(listener: (transaction: StoreTransaction) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Simulation hook: a subscription bought on another device the backend has never seen. */
  public simulatePurchaseOnAnotherDevice(productId: string, daysAgo: number): StoreTransaction {
    const transactionId = `txn_${this.deps.createId()}`
    const fields = {
      transactionId,
      originalTransactionId: transactionId,
      productId,
      purchasedAt: this.deps.now() - daysAgo * MILLISECONDS_IN_DAY,
    }
    const transaction: StoreTransaction = { ...fields, receipt: signReceipt(fields) }
    this.ledger = [...this.ledger, { ...transaction, isFinished: true }]
    this.persist()
    return transaction
  }

  public getLedgerSize(): number {
    return this.ledger.length
  }

  public stop(): void {
    this.timers.forEach((timerId) => clearTimeout(timerId))
    this.timers.clear()
    this.listeners.clear()
  }

  private emit(transaction: StoreTransaction): void {
    Array.from(this.listeners).forEach((listener) => listener({ ...transaction }))
  }

  private emitLater(transaction: StoreTransaction, delayMs: number): void {
    const timerId = setTimeout(() => {
      this.timers.delete(timerId)
      this.emit(transaction)
    }, delayMs)
    this.timers.add(timerId)
  }

  private toTransaction = ({ isFinished: _isFinished, ...transaction }: LedgerEntry) => transaction

  private persist(): void {
    writeJson(this.deps.storage, LEDGER_KEY, this.ledger)
  }
}
