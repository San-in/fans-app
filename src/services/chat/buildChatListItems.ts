import { CURRENT_USER_ID } from '@constants'
import type { MessageDto, OutboxItem } from '@types'
import { formatDayLabel, getLocalDayKey } from '@utils'

export type DayListItem = { type: 'day'; key: string; label: string }

export type MessageListItem = {
  type: 'message'
  key: string
  message: MessageDto
  isOwn: boolean
  /** Creator avatar sits on the last bubble of a consecutive run, as in the design. */
  isLastInGroup: boolean
}

export type PendingListItem = { type: 'pending'; key: string; item: OutboxItem }

export type ChatListItem = DayListItem | MessageListItem | PendingListItem

// Own messages are keyed by clientId both while pending and once confirmed,
// so confirmation updates the same cell in place instead of remounting it.
const getMessageKey = ({ clientId, authorId, id }: MessageDto) =>
  clientId && authorId === CURRENT_USER_ID ? `c:${clientId}` : `m:${id}`

// Wrappers are reused while their inputs are unchanged, so memoized rows only
// re-render when their own message (or grouping) actually changed.
const messageItemCache = new WeakMap<MessageDto, MessageListItem>()
const pendingItemCache = new WeakMap<OutboxItem, PendingListItem>()

const toMessageItem = (message: MessageDto, isLastInGroup: boolean): MessageListItem => {
  const cached = messageItemCache.get(message)
  if (cached && cached.isLastInGroup === isLastInGroup) {
    return cached
  }
  const item: MessageListItem = {
    type: 'message',
    key: getMessageKey(message),
    message,
    isOwn: message.authorId === CURRENT_USER_ID,
    isLastInGroup,
  }
  messageItemCache.set(message, item)
  return item
}

const toPendingItem = (outboxItem: OutboxItem): PendingListItem => {
  const cached = pendingItemCache.get(outboxItem)
  if (cached) {
    return cached
  }
  const item: PendingListItem = {
    type: 'pending',
    key: `c:${outboxItem.clientId}`,
    item: outboxItem,
  }
  pendingItemCache.set(outboxItem, item)
  return item
}

export const buildChatListItems = (
  messages: ReadonlyArray<MessageDto>,
  outbox: ReadonlyArray<OutboxItem>,
  now: number
): Array<ChatListItem> => {
  const items: Array<ChatListItem> = []
  let previousDayKey: string | null = null

  const addDaySeparatorIfNeeded = (timestamp: number) => {
    const dayKey = getLocalDayKey(timestamp)
    if (dayKey !== previousDayKey) {
      items.push({ type: 'day', key: `day:${dayKey}`, label: formatDayLabel(timestamp, now) })
      previousDayKey = dayKey
    }
  }

  messages.forEach((message, index) => {
    addDaySeparatorIfNeeded(message.createdAt)
    const nextMessage = messages[index + 1]
    const isLastInGroup =
      !nextMessage ||
      nextMessage.authorId !== message.authorId ||
      getLocalDayKey(nextMessage.createdAt) !== getLocalDayKey(message.createdAt)
    items.push(toMessageItem(message, isLastInGroup))
  })

  outbox.forEach((outboxItem) => {
    addDaySeparatorIfNeeded(outboxItem.createdAt)
    items.push(toPendingItem(outboxItem))
  })

  return items
}

/** Memoizes on input identity so a zustand selector returns a stable array. */
export const createChatListSelector = (now: () => number) => {
  let lastMessages: ReadonlyArray<MessageDto> | null = null
  let lastOutbox: ReadonlyArray<OutboxItem> | null = null
  let lastItems: Array<ChatListItem> = []

  return ({
    messages,
    outbox,
  }: {
    messages: ReadonlyArray<MessageDto>
    outbox: ReadonlyArray<OutboxItem>
  }) => {
    if (messages !== lastMessages || outbox !== lastOutbox) {
      lastMessages = messages
      lastOutbox = outbox
      lastItems = buildChatListItems(messages, outbox, now())
    }
    return lastItems
  }
}
