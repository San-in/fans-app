import {
  CATCH_UP_PAGE_SIZE,
  CURRENT_USER_ID,
  MAX_CATCH_UP_PAGES,
  MESSAGE_MAX_LENGTH,
  MESSAGE_PAGE_SIZE,
} from '@constants'
import type { AccessService } from '@services/access/AccessService'
import type { ServerApi } from '@services/api/createServerApi'
import type { RealtimeClient, RealtimeStatus } from '@services/realtime/RealtimeClient'
import type { RuntimeConfig } from '@services/runtime/config'
import type { KeyValueStorage } from '@services/storage'
import type {
  ConnectionStatus,
  MessageDto,
  MessagePageDto,
  OlderMessagesStatus,
  OutboxItem,
  RealtimeEvent,
  SendFailure,
  SendMessageResult,
} from '@types'
import { isApiError } from '@types'
import { computeBackoffDelay } from '@utils'
import { createStore, type StoreApi } from 'zustand/vanilla'

import { classifySendError, describeSendFailure } from './describeSendFailure'
import { findContiguousEnd, insertSorted } from './messageWindow'
import { OutboxRepository } from './OutboxRepository'
import { ThreadCache } from './ThreadCache'

export type ChatState = {
  isHydrated: boolean
  /** Confirmed messages, ascending by server seq. */
  messages: ReadonlyArray<MessageDto>
  /** Unconfirmed messages, ascending by local order. Always rendered after `messages`. */
  outbox: ReadonlyArray<OutboxItem>
  hasOlder: boolean
  olderStatus: OlderMessagesStatus
  connection: ConnectionStatus
  hasLoadedInitialPage: boolean
}

type Connectivity = {
  isOnline: () => boolean
  subscribe: (listener: (isOnline: boolean) => void) => () => void
}

type ChatEngineDependencies = {
  api: ServerApi
  realtime: RealtimeClient
  connectivity: Connectivity
  access: AccessService
  storage: KeyValueStorage
  config: RuntimeConfig
  createClientId: () => string
  now: () => number
  /** Dev switch that brings back the original bug: a new idempotency key per retry. */
  isLegacyDuplicateBugEnabled: () => boolean
}

type OutboxPatch = Partial<Omit<OutboxItem, 'clientId'>>

/**
 * Owns the thread on the device: the persisted outbox, the confirmed message
 * window, catch-up after reconnects, and pagination.
 *
 * Delivery guarantees rely on two rules:
 * 1. A message is written to disk with its clientId before it is shown as queued.
 * 2. Every send and every retry of it carries that same clientId, so the server
 *    can return the original instead of storing a copy.
 * Anything confirmed — by a send response, a realtime echo or a catch-up page —
 * goes through `applyServerMessages`, which removes the outbox entry and inserts
 * the message by id in one state update, so repeats are no-ops.
 */
export class ChatEngine {
  public readonly store: StoreApi<ChatState>
  private readonly outboxRepository: OutboxRepository
  private readonly threadCache: ThreadCache
  private readonly knownMessageIds = new Set<string>()
  /** Highest seq up to which the window has no holes; null until a window exists. */
  private syncedThroughSeq: number | null = null
  /** Confirmations that arrived before the first page did. */
  private bufferedConfirmations: Array<{
    messages: ReadonlyArray<MessageDto>
    clientIds: ReadonlyArray<string>
  }> = []
  private isRunning = false
  private isFlushing = false
  private isFlushRequested = false
  private syncPromise: Promise<void> | null = null
  private isSyncRequested = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null
  private cacheWriteTimer: ReturnType<typeof setTimeout> | null = null
  private unsubscribers: Array<() => void> = []

  constructor(private readonly deps: ChatEngineDependencies) {
    this.outboxRepository = new OutboxRepository(deps.storage)
    this.threadCache = new ThreadCache(deps.storage)
    this.store = createStore<ChatState>(() => ({
      isHydrated: false,
      messages: [],
      outbox: [],
      hasOlder: true,
      olderStatus: 'idle',
      connection: 'connecting',
      hasLoadedInitialPage: false,
    }))
  }

  public start(): void {
    if (this.isRunning) {
      return
    }
    this.isRunning = true
    if (!this.store.getState().isHydrated) {
      this.hydrate()
    }
    this.unsubscribers = [
      this.deps.connectivity.subscribe(this.handleConnectivityChange),
      this.deps.realtime.onStatusChange(this.handleRealtimeStatus),
      this.deps.realtime.onEvent(this.handleRealtimeEvent),
    ]
    this.refreshConnectionStatus()
    if (this.deps.connectivity.isOnline()) {
      void this.syncThenFlush()
    }
  }

  /** Like a process kill: in-flight continuations become no-ops and nothing else is written. */
  public stop(): void {
    this.isRunning = false
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []
    this.clearRetryTimer()
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer)
      this.syncRetryTimer = null
    }
    if (this.cacheWriteTimer) {
      clearTimeout(this.cacheWriteTimer)
      this.cacheWriteTimer = null
    }
  }

  /** Called when the app is backgrounded — the last chance before a possible kill. */
  public flushPendingWrites(): void {
    if (this.cacheWriteTimer) {
      clearTimeout(this.cacheWriteTimer)
      this.cacheWriteTimer = null
      this.threadCache.save(this.store.getState().messages)
    }
  }

  public getState(): ChatState {
    return this.store.getState()
  }

  public sendMessage(rawText: string): SendMessageResult {
    const text = rawText.trim()
    if (!text) {
      return { isAccepted: false, reason: 'empty' }
    }
    if (text.length > MESSAGE_MAX_LENGTH) {
      return { isAccepted: false, reason: 'tooLong' }
    }

    let item: OutboxItem
    try {
      item = {
        clientId: this.deps.createClientId(),
        text,
        localOrder: this.outboxRepository.takeNextLocalOrder(),
        createdAt: this.deps.now(),
        attempts: 0,
        status: 'queued',
        failure: null,
        isSending: false,
        nextRetryAt: null,
      }
      this.commitOutbox([...this.store.getState().outbox, item])
    } catch (error) {
      console.error('Could not persist the outgoing message', error)
      return { isAccepted: false, reason: 'storageFailed' }
    }

    void this.flushOutbox()
    return { isAccepted: true, clientId: item.clientId }
  }

  public retryMessage(clientId: string): void {
    const item = this.findOutboxItem(clientId)
    if (!item || item.status !== 'failed' || item.failure?.action === 'edit') {
      return
    }
    this.updateOutboxItem(
      clientId,
      { status: 'queued', failure: null, attempts: 0, nextRetryAt: null },
      { shouldPersist: true }
    )
    void this.flushOutbox()
  }

  public discardMessage(clientId: string): void {
    const { outbox } = this.store.getState()
    if (outbox.some((item) => item.clientId === clientId)) {
      this.commitOutbox(outbox.filter((item) => item.clientId !== clientId))
    }
  }

  /** Removes a failed message and hands its text back to the composer. */
  public takeMessageForEditing(clientId: string): string | null {
    const item = this.findOutboxItem(clientId)
    if (!item || item.status !== 'failed') {
      return null
    }
    this.discardMessage(clientId)
    return item.text
  }

  public async loadOlderMessages(): Promise<void> {
    const { messages, hasOlder, olderStatus } = this.store.getState()
    const [firstMessage] = messages
    if (!hasOlder || olderStatus === 'loading' || !firstMessage) {
      return
    }
    this.store.setState({ olderStatus: 'loading' })
    try {
      const page = await this.deps.api.getMessagesBefore(firstMessage.seq, MESSAGE_PAGE_SIZE)
      if (!this.isRunning) {
        return
      }
      const { messages: currentMessages } = this.store.getState()
      if (currentMessages[0]?.id !== firstMessage.id) {
        // The window was replaced while this page was in flight.
        this.store.setState({ olderStatus: 'idle' })
        return
      }
      const olderMessages = page.messages.filter(({ id }) => !this.knownMessageIds.has(id))
      olderMessages.forEach(({ id }) => this.knownMessageIds.add(id))
      this.store.setState({
        messages: [...olderMessages, ...currentMessages],
        hasOlder: page.hasMore,
        olderStatus: 'idle',
      })
    } catch {
      if (this.isRunning) {
        this.store.setState({ olderStatus: 'error' })
      }
    }
  }

  /** Pull-to-refresh and tests: catch up by cursor, then drain the outbox. */
  public async syncNow(): Promise<void> {
    await this.syncThenFlush()
  }

  private hydrate(): void {
    const cachedMessages = this.threadCache.load()
    cachedMessages.forEach(({ id }) => this.knownMessageIds.add(id))
    const [firstCached] = cachedMessages
    this.syncedThroughSeq = firstCached
      ? findContiguousEnd(cachedMessages, firstCached.seq - 1)
      : null

    // Nothing is in flight after a restart: whatever was "sending" is queued again
    // and will be retried with the same clientId.
    const confirmedClientIds = new Set(
      cachedMessages.map(({ clientId }) => clientId).filter(Boolean)
    )
    const outbox = this.outboxRepository
      .load()
      .filter(({ clientId }) => !confirmedClientIds.has(clientId))
      .map((record) => ({ ...record, isSending: false, nextRetryAt: null }))

    this.store.setState({
      isHydrated: true,
      messages: cachedMessages,
      outbox,
      hasOlder: firstCached ? firstCached.seq > 1 : true,
      hasLoadedInitialPage: cachedMessages.length > 0,
    })
  }

  private handleConnectivityChange = (isOnline: boolean) => {
    if (isOnline) {
      void this.syncThenFlush()
    } else {
      // Backoff timers mean nothing while offline: everything waits for the reconnect.
      this.clearRetryTimer()
      const { outbox } = this.store.getState()
      if (outbox.some(({ nextRetryAt, isSending }) => nextRetryAt !== null || isSending)) {
        this.store.setState({
          outbox: outbox.map((item) => ({ ...item, nextRetryAt: null, isSending: false })),
        })
      }
    }
    this.refreshConnectionStatus()
  }

  private handleRealtimeStatus = (status: RealtimeStatus) => {
    // Events published while the socket was down are gone for good, so every
    // (re)connect catches up by cursor instead of trusting the push channel.
    if (status === 'connected') {
      void this.syncThenFlush()
    }
    this.refreshConnectionStatus()
  }

  private handleRealtimeEvent = (event: RealtimeEvent) => {
    if (event.type === 'message.created') {
      this.applyServerMessages([event.message])
    }
  }

  private async syncThenFlush(): Promise<void> {
    await this.syncNewMessages()
    if (this.isRunning) {
      await this.flushOutbox()
    }
  }

  private syncNewMessages(): Promise<void> {
    if (this.syncPromise) {
      this.isSyncRequested = true
      return this.syncPromise
    }
    this.syncPromise = this.runSyncLoop().finally(() => {
      this.syncPromise = null
      this.refreshConnectionStatus()
    })
    this.refreshConnectionStatus()
    return this.syncPromise
  }

  private async runSyncLoop(): Promise<void> {
    do {
      this.isSyncRequested = false
      try {
        await this.syncOnce()
      } catch (error) {
        if (!isApiError(error)) {
          console.error('Chat sync failed', error)
        }
        // Going offline re-triggers a sync on reconnect by itself; anything
        // else (timeouts, 5xx) needs its own retry.
        if (!isApiError(error) || error.code !== 'NETWORK_OFFLINE') {
          this.scheduleSyncRetry()
        }
        return
      }
    } while (this.isSyncRequested && this.isRunning)
  }

  private scheduleSyncRetry(): void {
    if (this.syncRetryTimer || !this.isRunning) {
      return
    }
    this.syncRetryTimer = setTimeout(() => {
      this.syncRetryTimer = null
      if (this.isRunning && this.deps.connectivity.isOnline()) {
        void this.syncThenFlush()
      }
    }, this.deps.config.retryBaseDelayMs * 3)
  }

  private async syncOnce(): Promise<void> {
    if (this.syncedThroughSeq === null) {
      const page = await this.deps.api.getLatestMessages(MESSAGE_PAGE_SIZE)
      if (this.isRunning) {
        this.replaceWindow(page)
      }
      return
    }

    let afterSeq = this.syncedThroughSeq
    for (let pageIndex = 0; pageIndex < MAX_CATCH_UP_PAGES; pageIndex += 1) {
      const page = await this.deps.api.getMessagesAfter(afterSeq, CATCH_UP_PAGE_SIZE)
      if (!this.isRunning) {
        return
      }
      this.applyServerMessages(page.messages)
      const lastMessage = page.messages[page.messages.length - 1]
      if (!page.hasMore || !lastMessage) {
        return
      }
      afterSeq = lastMessage.seq
    }

    // Too far behind to page forward: start again from the newest page.
    const latestPage = await this.deps.api.getLatestMessages(MESSAGE_PAGE_SIZE)
    if (this.isRunning) {
      this.replaceWindow(latestPage)
    }
  }

  private replaceWindow({ messages, hasMore }: MessagePageDto): void {
    this.knownMessageIds.clear()
    messages.forEach(({ id }) => this.knownMessageIds.add(id))
    const lastMessage = messages[messages.length - 1]
    this.syncedThroughSeq = lastMessage?.seq ?? 0

    const { outbox } = this.store.getState()
    const confirmedClientIds = this.collectOwnClientIds(messages)
    const nextOutbox = outbox.filter(({ clientId }) => !confirmedClientIds.has(clientId))
    if (nextOutbox.length !== outbox.length) {
      this.outboxRepository.save(nextOutbox)
    }
    this.store.setState({
      messages,
      outbox: nextOutbox,
      hasOlder: hasMore,
      hasLoadedInitialPage: true,
    })
    this.scheduleCacheWrite()

    const buffered = this.bufferedConfirmations
    this.bufferedConfirmations = []
    buffered.forEach(({ messages: bufferedMessages, clientIds }) =>
      this.applyServerMessages(bufferedMessages, clientIds)
    )
    void this.flushOutbox()
  }

  /**
   * The single entry point for confirmed messages from any channel. Removing the
   * outbox entry and inserting the message happen in one state update, so the
   * bubble never disappears for a frame and repeats change nothing.
   */
  private applyServerMessages(
    incoming: ReadonlyArray<MessageDto>,
    explicitlyConfirmedClientIds: ReadonlyArray<string> = []
  ): void {
    if (incoming.length === 0 && explicitlyConfirmedClientIds.length === 0) {
      return
    }
    if (this.syncedThroughSeq === null) {
      // No window to insert into yet. Keep the outbox entry visible until the
      // first page lands, then apply both together.
      this.bufferedConfirmations.push({
        messages: incoming,
        clientIds: explicitlyConfirmedClientIds,
      })
      void this.syncNewMessages()
      return
    }
    const { outbox, messages } = this.store.getState()

    const confirmedClientIds = this.collectOwnClientIds(incoming)
    explicitlyConfirmedClientIds.forEach((clientId) => confirmedClientIds.add(clientId))
    const nextOutbox = outbox.some(({ clientId }) => confirmedClientIds.has(clientId))
      ? outbox.filter(({ clientId }) => !confirmedClientIds.has(clientId))
      : outbox

    let nextMessages = messages
    let hasGap = false
    const freshMessages: Array<MessageDto> = []
    incoming.forEach((message) => {
      if (!this.knownMessageIds.has(message.id)) {
        this.knownMessageIds.add(message.id)
        freshMessages.push(message)
      }
    })
    if (freshMessages.length > 0) {
      nextMessages = insertSorted(messages, freshMessages)
      const contiguousEnd = findContiguousEnd(nextMessages, this.syncedThroughSeq)
      this.syncedThroughSeq = contiguousEnd
      hasGap = freshMessages.some(({ seq }) => seq > contiguousEnd)
    }

    if (nextOutbox !== outbox) {
      this.outboxRepository.save(nextOutbox)
    }
    if (nextOutbox !== outbox || nextMessages !== messages) {
      this.store.setState({ outbox: nextOutbox, messages: nextMessages })
    }
    if (nextMessages !== messages) {
      this.scheduleCacheWrite()
    }
    if (hasGap) {
      // A message landed past a hole (e.g. the echo of a lost send was dropped): fetch the hole.
      void this.syncNewMessages()
    }
  }

  private async flushOutbox(): Promise<void> {
    if (this.isFlushing) {
      this.isFlushRequested = true
      return
    }
    this.isFlushing = true
    try {
      do {
        this.isFlushRequested = false
        await this.drainQueue()
      } while (this.isFlushRequested && this.isRunning)
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Strictly one send at a time, in local order. A message waiting out a
   * backoff blocks the ones behind it — otherwise the server would assign
   * later messages earlier seqs. Failed messages step out of the line.
   */
  private async drainQueue(): Promise<void> {
    // Sends wait for the first page: a confirmation needs a window to land in,
    // and `replaceWindow` restarts the flush once there is one.
    while (this.isRunning && this.deps.connectivity.isOnline() && this.syncedThroughSeq !== null) {
      const head = this.store
        .getState()
        .outbox.find(({ status, isSending }) => status === 'queued' && !isSending)
      if (!head) {
        return
      }
      const waitMs = head.nextRetryAt === null ? 0 : head.nextRetryAt - this.deps.now()
      if (waitMs > 0) {
        this.scheduleRetry(waitMs)
        return
      }
      const shouldContinue = await this.sendItem(head)
      if (!shouldContinue) {
        return
      }
    }
  }

  private async sendItem(item: OutboxItem): Promise<boolean> {
    this.updateOutboxItem(item.clientId, { isSending: true, nextRetryAt: null })

    const idempotencyKey =
      this.deps.isLegacyDuplicateBugEnabled() && item.attempts > 0
        ? this.deps.createClientId()
        : item.clientId

    try {
      const response = await this.deps.api.sendMessage({
        clientId: idempotencyKey,
        text: item.text,
      })
      if (!this.isRunning) {
        return false
      }
      this.deps.access.applyQuota(response.quota)
      this.applyServerMessages([response.message], [item.clientId])
      return true
    } catch (error) {
      if (!this.isRunning) {
        return false
      }
      return this.handleSendFailure(item.clientId, error)
    }
  }

  /** Returns whether the queue should keep draining. */
  private handleSendFailure(clientId: string, error: unknown): boolean {
    const item = this.findOutboxItem(clientId)
    if (!item) {
      // Confirmed through another channel while this request was in flight.
      return true
    }
    const code = isApiError(error) ? error.code : null
    const serverMessage = error instanceof Error ? error.message : ''

    switch (classifySendError(code)) {
      case 'offline':
        // Not the message's fault: attempts stay untouched and it simply waits.
        this.updateOutboxItem(clientId, { isSending: false })
        return false
      case 'permanent':
        if (code === 'QUOTA_EXCEEDED') {
          this.deps.access.applyQuota({
            limit: this.deps.access.store.getState().quota?.limit ?? null,
            remaining: 0,
          })
        }
        this.markFailed(clientId, item.attempts + 1, describeSendFailure(code, serverMessage))
        return true
      case 'transient': {
        const attempts = item.attempts + 1
        if (attempts >= this.deps.config.maxAutoSendAttempts) {
          this.markFailed(clientId, attempts, describeSendFailure(code, serverMessage))
          return true
        }
        const retryAfterMs = isApiError(error) ? error.retryAfterMs : null
        const nextRetryAt =
          this.deps.now() +
          computeBackoffDelay({
            attempt: attempts,
            baseDelayMs: this.deps.config.retryBaseDelayMs,
            maxDelayMs: this.deps.config.retryMaxDelayMs,
            retryAfterMs,
          })
        this.updateOutboxItem(
          clientId,
          { attempts, isSending: false, nextRetryAt },
          { shouldPersist: true }
        )
        return true
      }
    }
  }

  private markFailed(clientId: string, attempts: number, failure: SendFailure): void {
    this.updateOutboxItem(
      clientId,
      { status: 'failed', failure, attempts, isSending: false, nextRetryAt: null },
      { shouldPersist: true }
    )
  }

  private scheduleRetry(delayMs: number): void {
    this.clearRetryTimer()
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.flushOutbox()
    }, delayMs)
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  private scheduleCacheWrite(): void {
    if (this.cacheWriteTimer) {
      return
    }
    this.cacheWriteTimer = setTimeout(() => {
      this.cacheWriteTimer = null
      if (this.isRunning) {
        this.threadCache.save(this.store.getState().messages)
      }
    }, this.deps.config.threadCacheWriteDelayMs)
  }

  private refreshConnectionStatus(): void {
    let connection: ConnectionStatus = 'online'
    if (!this.deps.connectivity.isOnline()) {
      connection = 'offline'
    } else if (this.syncPromise) {
      connection = 'syncing'
    } else if (this.deps.realtime.getStatus() !== 'connected') {
      connection = 'connecting'
    }
    if (this.store.getState().connection !== connection) {
      this.store.setState({ connection })
    }
  }

  private collectOwnClientIds(messages: ReadonlyArray<MessageDto>): Set<string> {
    const clientIds = new Set<string>()
    messages.forEach(({ clientId, authorId }) => {
      if (clientId && authorId === CURRENT_USER_ID) {
        clientIds.add(clientId)
      }
    })
    return clientIds
  }

  private findOutboxItem(clientId: string): OutboxItem | undefined {
    return this.store.getState().outbox.find((item) => item.clientId === clientId)
  }

  /** Persist first, then publish: the UI never shows an outbox the disk doesn't have. */
  private commitOutbox(outbox: ReadonlyArray<OutboxItem>): void {
    this.outboxRepository.save(outbox)
    this.store.setState({ outbox })
  }

  private updateOutboxItem(
    clientId: string,
    patch: OutboxPatch,
    { shouldPersist = false }: { shouldPersist?: boolean } = {}
  ): void {
    const outbox = this.store
      .getState()
      .outbox.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item))
    if (shouldPersist) {
      this.commitOutbox(outbox)
    } else {
      this.store.setState({ outbox })
    }
  }
}
