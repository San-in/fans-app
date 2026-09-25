import type { StoreTransaction } from './api'

export type ProductType = 'subscription' | 'consumable'

export type StoreProduct = {
  id: string
  type: ProductType
  title: string
  description: string
  displayPrice: string
  periodLabel: string | null
}

export type StorePurchaseResult =
  | { status: 'success'; transaction: StoreTransaction }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string }

export type AccessStatus = 'unknown' | 'free' | 'active' | 'expired'

export type PurchaseFlow =
  | { status: 'idle' }
  | { status: 'purchasing'; productId: string }
  | { status: 'verifying'; productId: string; transactionId: string }
  | { status: 'restoring' }

export type PurchaseOutcome =
  | { type: 'purchased'; productId: string }
  | { type: 'cancelled'; productId: string }
  | { type: 'failed'; productId: string; message: string }
  | { type: 'rejected'; productId: string; message: string }
  | { type: 'restored'; count: number }
  | { type: 'restoredExpired' }
  | { type: 'nothingToRestore' }
  | { type: 'restoreFailed'; message: string }

/** A store transaction the backend has not confirmed yet. Survives restarts. */
export type PendingTransaction = StoreTransaction & {
  firstSeenAt: number
  lastError: string | null
}

export type PurchaseStartResult = 'started' | 'ignoredBusy' | 'alreadyActive'
