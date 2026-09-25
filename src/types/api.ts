/**
 * Wire contract between the app and the (mock) backend. Everything that
 * crosses the simulated network is one of these plain JSON shapes, so the
 * client never holds a reference to server-side objects.
 */

export type UserId = string

export type MessageKind = 'text' | 'gift'

export type MessageDto = {
  id: string
  /** Server-assigned position in the thread. The only source of message order. */
  seq: number
  /** Idempotency key minted by the sending device; null for history / other devices. */
  clientId: string | null
  authorId: UserId
  kind: MessageKind
  text: string
  createdAt: number
}

export type MessagePageDto = {
  /** Always ascending by `seq`. */
  messages: Array<MessageDto>
  hasMore: boolean
}

export type QuotaDto = {
  /** null means unlimited (All Access). */
  limit: number | null
  remaining: number | null
}

export type EntitlementDto = {
  productId: string
  status: 'active' | 'expired'
  expiresAt: number
  originalTransactionId: string
}

export type AccessDto = {
  allAccess: EntitlementDto | null
  quota: QuotaDto
}

export type SendMessageRequest = {
  clientId: string
  text: string
}

export type SendMessageResponse = {
  message: MessageDto
  /** True when the server had already accepted this clientId and returned the original. */
  wasDuplicate: boolean
  quota: QuotaDto
}

/** What the store (StoreKit / Play Billing) hands to the app after a purchase. */
export type StoreTransaction = {
  transactionId: string
  originalTransactionId: string
  productId: string
  purchasedAt: number
  /** Opaque signed payload; only the backend can validate it. */
  receipt: string
}

export type VerifyPurchaseResponse =
  | { status: 'confirmed'; access: AccessDto }
  | { status: 'pending' }
  | { status: 'rejected'; reason: string }

export type RestorePurchasesResponse = {
  access: AccessDto
  restoredCount: number
}

export type RealtimeEvent =
  { type: 'message.created'; message: MessageDto } | { type: 'access.updated' }

export type ApiErrorCode =
  | 'NETWORK_OFFLINE'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'VALIDATION_FAILED'
  | 'QUOTA_EXCEEDED'

export type ApiError = Error & {
  name: 'ApiError'
  code: ApiErrorCode
  retryAfterMs: number | null
}

export const createApiError = (
  code: ApiErrorCode,
  message: string,
  retryAfterMs: number | null = null
): ApiError => Object.assign(new Error(message), { name: 'ApiError' as const, code, retryAfterMs })

// A brand check instead of `instanceof`: Babel's class transform makes
// subclassing `Error` unreliable across the Jest and Hermes builds.
export const isApiError = (error: unknown): error is ApiError =>
  error instanceof Error && error.name === 'ApiError' && 'code' in error
