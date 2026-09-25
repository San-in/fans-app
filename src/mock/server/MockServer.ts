import { CURRENT_USER_ID } from '@constants'
import type { DevSettingsStore } from '@mock/devSettings/DevSettingsStore'
import type { KeyValueStorage } from '@services/storage'
import type {
  AccessDto,
  MessageDto,
  MessagePageDto,
  RealtimeEvent,
  RestorePurchasesResponse,
  SendMessageRequest,
  SendMessageResponse,
  StoreTransaction,
  VerifyPurchaseResponse,
} from '@types'

import { RealtimeHub } from './RealtimeHub'
import { ServerBilling } from './ServerBilling'
import { ServerChat } from './ServerChat'

type MockServerDependencies = {
  storage: KeyValueStorage
  devSettings: DevSettingsStore
  now: () => number
  confirmationDelayMs: number
}

export type MockServerSnapshot = {
  acceptedMessages: number
  quotaUsed: number
  pendingPurchases: number
  allAccessExpiresAt: number | null
}

/**
 * The whole backend, in-process. The app reaches the request methods only
 * through `ServerApi` (which routes them over the simulated network); the
 * `simulate*` methods are the dev panel's direct line to the "server room".
 * Every request is made as the single signed-in fan.
 */
export class MockServer {
  private readonly hub = new RealtimeHub()
  private readonly chat: ServerChat
  private readonly billing: ServerBilling

  constructor({ storage, devSettings, now, confirmationDelayMs }: MockServerDependencies) {
    this.chat = new ServerChat({
      storage,
      hub: this.hub,
      now,
      hasUnlimitedMessages: () => this.billing.hasActiveAllAccess(),
    })
    this.billing = new ServerBilling({
      storage,
      hub: this.hub,
      devSettings,
      now,
      confirmationDelayMs,
      getQuota: () => this.chat.getQuota(),
      postGiftMessage: (clientId, text) => {
        this.chat.postGiftMessage(clientId, text)
      },
    })
  }

  public start(): void {
    this.billing.start()
  }

  public stop(): void {
    this.billing.stop()
  }

  public subscribe(listener: (event: RealtimeEvent) => void): () => void {
    return this.hub.subscribe(listener)
  }

  public getLatestMessages(limit: number): MessagePageDto {
    return this.chat.getLatest(limit)
  }

  public getMessagesBefore(beforeSeq: number, limit: number): MessagePageDto {
    return this.chat.getBefore(beforeSeq, limit)
  }

  public getMessagesAfter(afterSeq: number, limit: number): MessagePageDto {
    return this.chat.getAfter(afterSeq, limit)
  }

  public sendMessage(request: SendMessageRequest): SendMessageResponse {
    return this.chat.accept(CURRENT_USER_ID, request)
  }

  public getAccess(): AccessDto {
    return this.billing.getAccess()
  }

  public verifyPurchase(transaction: StoreTransaction): VerifyPurchaseResponse {
    return this.billing.verify(transaction)
  }

  public restorePurchases(transactions: ReadonlyArray<StoreTransaction>): RestorePurchasesResponse {
    return this.billing.restore(transactions)
  }

  public simulateCreatorMessages(count: number): Array<MessageDto> {
    return this.chat.postCreatorMessages(count)
  }

  public simulateConfirmPendingPurchases(): number {
    return this.billing.confirmAllPending()
  }

  public simulateExpireAllAccess(): void {
    this.billing.expireAllAccess()
  }

  public countAcceptedWithText(text: string): number {
    return this.chat.countAcceptedWithText(text)
  }

  public getSnapshot(): MockServerSnapshot {
    return {
      acceptedMessages: this.chat.getAcceptedCount(),
      quotaUsed: this.chat.getQuotaUsed(),
      pendingPurchases: this.billing.countPending(),
      allAccessExpiresAt: this.billing.getEntitlementExpiresAt(),
    }
  }
}
