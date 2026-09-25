import {
  CREATOR,
  CURRENT_USER_ID,
  FREE_MESSAGE_LIMIT,
  HISTORY_SIZE,
  MESSAGE_MAX_LENGTH,
} from '@constants'
import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type {
  MessageDto,
  MessageKind,
  MessagePageDto,
  QuotaDto,
  SendMessageRequest,
  SendMessageResponse,
  UserId,
} from '@types'
import { createApiError } from '@types'
import { createSeededRandom } from '@utils'

import { createHistoryMessage } from './historyGenerator'
import type { RealtimeHub } from './RealtimeHub'

const CHAT_KEY = 'chat.v1'
const LINK_PATTERN = /(https?:\/\/|www\.)\S+/i

const CREATOR_REPLIES = [
  'Thank you so much! 🙏',
  'New video drops Friday',
  'Haha love that',
  'Shooting in the studio today 🎬',
  'Appreciate you being here ✨',
  'Good question — answering in the next live',
  'Just landed, more soon',
  'That lens is my favourite too',
]

type ServerChatSnapshot = {
  nextSeq: number
  /** Everything accepted after the generated history, ascending and dense by seq. */
  accepted: Array<MessageDto>
  quotaUsed: number
}

type ServerChatDependencies = {
  storage: KeyValueStorage
  hub: RealtimeHub
  now: () => number
  hasUnlimitedMessages: () => boolean
}

const toIdempotencyKey = (authorId: UserId, clientId: string) => `${authorId}:${clientId}`

/**
 * Server-side thread. Owns the final order (`seq`) and remembers every
 * accepted clientId, so a retried send returns the original message instead
 * of storing a second copy. Persisted separately from anything the app owns.
 */
export class ServerChat {
  private snapshot: ServerChatSnapshot
  private readonly acceptedByClientId = new Map<string, MessageDto>()

  constructor(private readonly deps: ServerChatDependencies) {
    this.snapshot = readJson<ServerChatSnapshot>(deps.storage, CHAT_KEY, {
      nextSeq: HISTORY_SIZE + 1,
      accepted: [],
      quotaUsed: 0,
    })
    this.snapshot.accepted.forEach((message) => this.indexMessage(message))
  }

  public getLatest(limit: number): MessagePageDto {
    const lastSeq = this.getLastSeq()
    const firstSeq = Math.max(1, lastSeq - limit + 1)
    return { messages: this.getRange(firstSeq, lastSeq), hasMore: firstSeq > 1 }
  }

  public getBefore(beforeSeq: number, limit: number): MessagePageDto {
    const lastSeq = Math.min(beforeSeq - 1, this.getLastSeq())
    if (lastSeq < 1) {
      return { messages: [], hasMore: false }
    }
    const firstSeq = Math.max(1, lastSeq - limit + 1)
    return { messages: this.getRange(firstSeq, lastSeq), hasMore: firstSeq > 1 }
  }

  public getAfter(afterSeq: number, limit: number): MessagePageDto {
    const firstSeq = afterSeq + 1
    const lastSeq = Math.min(this.getLastSeq(), afterSeq + limit)
    if (firstSeq > lastSeq) {
      return { messages: [], hasMore: false }
    }
    return {
      messages: this.getRange(firstSeq, lastSeq),
      hasMore: lastSeq < this.getLastSeq(),
    }
  }

  public accept(authorId: UserId, { clientId, text }: SendMessageRequest): SendMessageResponse {
    const trimmedText = text.trim()
    if (!trimmedText) {
      throw createApiError('VALIDATION_FAILED', 'Message is empty.')
    }
    if (trimmedText.length > MESSAGE_MAX_LENGTH) {
      throw createApiError(
        'VALIDATION_FAILED',
        `Messages can be up to ${MESSAGE_MAX_LENGTH} characters. Shorten it and try again.`
      )
    }
    if (LINK_PATTERN.test(trimmedText)) {
      throw createApiError(
        'VALIDATION_FAILED',
        'Links can’t be sent to creators. Remove the link and send again.'
      )
    }

    // Checked before the quota on purpose: retrying a message that was already
    // accepted must succeed even if the fan has used their free messages since.
    const existing = this.acceptedByClientId.get(toIdempotencyKey(authorId, clientId))
    if (existing) {
      return { message: existing, wasDuplicate: true, quota: this.getQuota() }
    }

    const isUnlimited = this.deps.hasUnlimitedMessages()
    if (!isUnlimited && this.snapshot.quotaUsed >= FREE_MESSAGE_LIMIT) {
      throw createApiError(
        'QUOTA_EXCEEDED',
        `You’ve used your ${FREE_MESSAGE_LIMIT} free messages. Get All Access to keep chatting.`
      )
    }

    const message = this.append({ authorId, clientId, kind: 'text', text: trimmedText }, () => {
      if (!isUnlimited) {
        this.snapshot.quotaUsed += 1
      }
    })
    return { message, wasDuplicate: false, quota: this.getQuota() }
  }

  public getQuota(): QuotaDto {
    if (this.deps.hasUnlimitedMessages()) {
      return { limit: null, remaining: null }
    }
    return {
      limit: FREE_MESSAGE_LIMIT,
      remaining: Math.max(0, FREE_MESSAGE_LIMIT - this.snapshot.quotaUsed),
    }
  }

  /** Idempotent by clientId, so a gift transaction can never post twice. */
  public postGiftMessage(clientId: string, text: string): MessageDto {
    const existing = this.acceptedByClientId.get(toIdempotencyKey(CURRENT_USER_ID, clientId))
    if (existing) {
      return existing
    }
    return this.append({ authorId: CURRENT_USER_ID, clientId, kind: 'gift', text })
  }

  /** Simulation hook: another device (the creator's) posts into the thread. */
  public postCreatorMessages(count: number): Array<MessageDto> {
    const random = createSeededRandom(this.snapshot.nextSeq)
    return Array.from({ length: count }, () =>
      this.append({
        authorId: CREATOR.id,
        clientId: null,
        kind: 'text',
        text: CREATOR_REPLIES[Math.floor(random() * CREATOR_REPLIES.length)] ?? 'Hi!',
      })
    )
  }

  public getAcceptedCount(): number {
    return this.snapshot.accepted.length
  }

  public getQuotaUsed(): number {
    return this.snapshot.quotaUsed
  }

  public countAcceptedWithText(text: string): number {
    return this.snapshot.accepted.filter((message) => message.text === text).length
  }

  private getLastSeq(): number {
    return this.snapshot.nextSeq - 1
  }

  private getRange(firstSeq: number, lastSeq: number): Array<MessageDto> {
    const messages: Array<MessageDto> = []
    for (let seq = firstSeq; seq <= lastSeq; seq += 1) {
      const message =
        seq <= HISTORY_SIZE
          ? createHistoryMessage(seq)
          : this.snapshot.accepted[seq - HISTORY_SIZE - 1]
      if (message) {
        messages.push(message)
      }
    }
    return messages
  }

  private append(
    fields: { authorId: UserId; clientId: string | null; kind: MessageKind; text: string },
    applySideEffects?: () => void
  ): MessageDto {
    const seq = this.snapshot.nextSeq
    const message: MessageDto = { ...fields, id: `m${seq}`, seq, createdAt: this.deps.now() }

    this.snapshot = {
      ...this.snapshot,
      nextSeq: seq + 1,
      accepted: [...this.snapshot.accepted, message],
    }
    applySideEffects?.()
    // Commit before anyone can observe the message (response or realtime echo).
    writeJson(this.deps.storage, CHAT_KEY, this.snapshot)

    this.indexMessage(message)
    this.deps.hub.publish({ type: 'message.created', message })
    return message
  }

  private indexMessage(message: MessageDto): void {
    if (message.clientId) {
      this.acceptedByClientId.set(toIdempotencyKey(message.authorId, message.clientId), message)
    }
  }
}
