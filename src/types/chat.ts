export type SendFailureCode =
  'TIMEOUT' | 'SERVER_ERROR' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'QUOTA_EXCEEDED' | 'UNKNOWN'

/** What the failed bubble offers: a plain retry, or a different action first. */
export type SendFailureAction = 'retry' | 'edit' | 'getAccess'

export type SendFailure = {
  code: SendFailureCode
  /** User-facing explanation shown under the bubble. */
  message: string
  action: SendFailureAction
}

/**
 * Persisted form of a message the user composed but the server has not
 * confirmed. Written to disk before the message is shown as queued.
 */
export type OutboxRecord = {
  /** Idempotency key — minted once at compose time, reused by every retry and restart. */
  clientId: string
  text: string
  /** Device-local order; keeps unconfirmed messages in the order they were typed. */
  localOrder: number
  createdAt: number
  attempts: number
  status: 'queued' | 'failed'
  failure: SendFailure | null
}

/** Runtime-only fields are never persisted: after a restart nothing is "in flight". */
export type OutboxItem = OutboxRecord & {
  isSending: boolean
  nextRetryAt: number | null
}

export type ConnectionStatus = 'offline' | 'connecting' | 'syncing' | 'online'

export type OlderMessagesStatus = 'idle' | 'loading' | 'error'

export type SendMessageResult =
  | { isAccepted: true; clientId: string }
  | { isAccepted: false; reason: 'empty' | 'tooLong' | 'storageFailed' }
