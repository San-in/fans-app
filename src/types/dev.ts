export type StoreOutcomeSetting = 'success' | 'cancel' | 'fail'

export type BackendConfirmationSetting = 'instant' | 'delayed' | 'manual' | 'reject'

/** One-shot failures applied to the next send attempts, in order. */
export type SendFault = 'loseResponse' | 'serverError' | 'rateLimited'

/** Persisted so a simulated offline state survives a force-quit. */
export type DevSettings = {
  isOffline: boolean
  latencyMs: number
  /** Reproduces the original bug: every retry mints a new idempotency key. */
  legacyDuplicateBug: boolean
  /** Delivers every realtime and store event twice. */
  repeatEvents: boolean
  storeOutcome: StoreOutcomeSetting
  backendConfirmation: BackendConfirmationSetting
}
