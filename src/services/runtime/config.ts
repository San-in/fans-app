import type { DevSettings } from '@types'

/** Every timing in one place, so tests can shrink them and the demo can keep them humane. */
export type RuntimeConfig = {
  requestTimeoutMs: number
  retryBaseDelayMs: number
  retryMaxDelayMs: number
  maxAutoSendAttempts: number
  realtimeConnectDelayMs: number
  storeSheetDelayMs: number
  backendConfirmationDelayMs: number
  purchasePollIntervalMs: number
  threadCacheWriteDelayMs: number
  defaultDevSettings: DevSettings
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  requestTimeoutMs: 5000,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 15_000,
  maxAutoSendAttempts: 3,
  realtimeConnectDelayMs: 600,
  storeSheetDelayMs: 1200,
  backendConfirmationDelayMs: 6000,
  purchasePollIntervalMs: 2000,
  threadCacheWriteDelayMs: 400,
  defaultDevSettings: {
    isOffline: false,
    latencyMs: 350,
    legacyDuplicateBug: false,
    repeatEvents: false,
    storeOutcome: 'success',
    backendConfirmation: 'delayed',
  },
}
