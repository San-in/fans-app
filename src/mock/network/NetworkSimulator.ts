import type { DevSettingsStore } from '@mock/devSettings/DevSettingsStore'
import { createApiError } from '@types'
import { cloneForWire, delay } from '@utils'

// Failing instantly would hide the "waiting" state; real offline requests fail fast but not in 0ms.
const OFFLINE_FAILURE_DELAY_MS = 60
const RATE_LIMIT_RETRY_AFTER_MS = 2000

export type NetworkOperation =
  | 'getLatestMessages'
  | 'getMessagesBefore'
  | 'getMessagesAfter'
  | 'sendMessage'
  | 'getAccess'
  | 'verifyPurchase'
  | 'restorePurchases'

type RequestOptions = {
  /** For sends: lets a lost response also swallow the realtime echo of that message. */
  clientId?: string
}

type Outcome<T> = { isSuccess: true; value: T } | { isSuccess: false; error: unknown }

const createOfflineError = () => createApiError('NETWORK_OFFLINE', 'The device is offline.')

/**
 * The "wire" between the app and the mock backend. Every backend call goes
 * through `request`, which applies connectivity, latency and injected faults
 * exactly where a real network would: before the server sees the request, or
 * after it has already processed it.
 */
export class NetworkSimulator {
  private readonly listeners = new Set<(isOnline: boolean) => void>()
  private readonly suppressedEchoClientIds = new Set<string>()
  private readonly unsubscribeSettings: () => void
  private lastKnownOnline: boolean
  private isDisposed = false

  constructor(private readonly devSettings: DevSettingsStore) {
    this.lastKnownOnline = !devSettings.getState().isOffline
    this.unsubscribeSettings = devSettings.store.subscribe(({ isOffline }) => {
      const isOnline = !isOffline
      if (isOnline === this.lastKnownOnline) {
        return
      }
      this.lastKnownOnline = isOnline
      this.listeners.forEach((listener) => listener(isOnline))
    })
  }

  public isOnline(): boolean {
    return !this.devSettings.getState().isOffline
  }

  public subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Returns true once for a message whose echo must be dropped (see `loseResponse`). */
  public consumeEchoSuppression(clientId: string): boolean {
    return this.suppressedEchoClientIds.delete(clientId)
  }

  public async request<T>(
    operation: NetworkOperation,
    handler: () => T,
    { clientId }: RequestOptions = {}
  ): Promise<T> {
    const { latencyMs } = this.devSettings.getState()

    if (!this.isOnline()) {
      await delay(OFFLINE_FAILURE_DELAY_MS)
      throw createOfflineError()
    }
    await delay(latencyMs / 2)
    if (this.isDisposed) {
      // The app process is gone; nothing it sent after this point ever arrives.
      return new Promise<T>(() => {})
    }
    if (!this.isOnline()) {
      throw createOfflineError()
    }

    const fault = operation === 'sendMessage' ? this.devSettings.takeSendFault() : null
    if (fault === 'serverError') {
      throw createApiError('SERVER_ERROR', 'The server returned 503 Service Unavailable.')
    }
    if (fault === 'rateLimited') {
      throw createApiError('RATE_LIMITED', 'Too many requests.', RATE_LIMIT_RETRY_AFTER_MS)
    }
    if (fault === 'loseResponse' && clientId) {
      this.suppressedEchoClientIds.add(clientId)
    }

    let outcome: Outcome<T>
    try {
      outcome = { isSuccess: true, value: cloneForWire(handler()) }
    } catch (error) {
      outcome = { isSuccess: false, error }
    }

    if (fault === 'loseResponse') {
      // The server has committed the request, but its response never arrives.
      // Only the client's own timeout can end this call.
      return new Promise<T>(() => {})
    }

    await delay(latencyMs / 2)
    if (this.isDisposed) {
      return new Promise<T>(() => {})
    }
    if (!this.isOnline()) {
      // Dropped on the way back — the request may still have been processed.
      throw createOfflineError()
    }
    if (!outcome.isSuccess) {
      throw outcome.error
    }
    return outcome.value
  }

  public dispose(): void {
    this.isDisposed = true
    this.unsubscribeSettings()
    this.listeners.clear()
    this.suppressedEchoClientIds.clear()
  }
}
