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

type ThreadEntry =
  { message: MessageDto; outboxItem?: never } | { outboxItem: OutboxItem; message?: never }

const isAnchored = (item: OutboxItem): item is OutboxItem & { anchorSeq: number } =>
  item.status === 'failed' && item.anchorSeq !== null

/**
 * Confirmed messages in seq order. A failed message stays where it failed (after
 * its anchor), so newer messages land below it. Queued ones always come last, in
 * local order: their seq doesn't exist yet and will be the newest.
 */
const mergeThread = (
  messages: ReadonlyArray<MessageDto>,
  outbox: ReadonlyArray<OutboxItem>
): Array<ThreadEntry> => {
  const anchored = outbox
    .filter(isAnchored)
    .sort(
      (first, second) => first.anchorSeq - second.anchorSeq || first.localOrder - second.localOrder
    )
  const entries: Array<ThreadEntry> = []
  let anchoredIndex = 0
  let nextAnchored = anchored[0]
  const addAnchoredBefore = (seq: number) => {
    while (nextAnchored && nextAnchored.anchorSeq < seq) {
      entries.push({ outboxItem: nextAnchored })
      anchoredIndex += 1
      nextAnchored = anchored[anchoredIndex]
    }
  }
  messages.forEach((message) => {
    addAnchoredBefore(message.seq)
    entries.push({ message })
  })
  addAnchoredBefore(Number.POSITIVE_INFINITY)
  outbox.forEach((item) => {
    if (!isAnchored(item)) {
      entries.push({ outboxItem: item })
    }
  })
  return entries
}

const getEntryAuthor = (entry: ThreadEntry | undefined) =>
  entry?.outboxItem ? CURRENT_USER_ID : entry?.message.authorId

const getEntryTime = (entry: ThreadEntry) =>
  entry.outboxItem ? entry.outboxItem.createdAt : entry.message.createdAt

type ChatListInput = {
  messages: ReadonlyArray<MessageDto>
  outbox: ReadonlyArray<OutboxItem>
  /** More history above the loaded window. */
  hasOlder: boolean
}

export const buildChatListItems = (
  { messages, outbox, hasOlder }: ChatListInput,
  now: number
): Array<ChatListItem> => {
  const items: Array<ChatListItem> = []
  let previousDayKey: string | null = null

  const addDaySeparatorIfNeeded = (timestamp: number) => {
    const dayKey = getLocalDayKey(timestamp)
    // The oldest loaded message isn't known to start its day while older ones remain.
    // A separator there would also keep its key as a same-day page slides in above it,
    // and FlashList, anchored to it, would let the whole page jump into view.
    if (previousDayKey === null && hasOlder) {
      previousDayKey = dayKey
      return
    }
    if (dayKey !== previousDayKey) {
      items.push({ type: 'day', key: `day:${dayKey}`, label: formatDayLabel(timestamp, now) })
      previousDayKey = dayKey
    }
  }

  const entries = mergeThread(messages, outbox)
  entries.forEach((entry, index) => {
    addDaySeparatorIfNeeded(getEntryTime(entry))
    if (entry.outboxItem) {
      items.push(toPendingItem(entry.outboxItem))
      return
    }
    const { message } = entry
    const nextEntry = entries[index + 1]
    const isLastInGroup =
      !nextEntry ||
      getEntryAuthor(nextEntry) !== message.authorId ||
      getLocalDayKey(getEntryTime(nextEntry)) !== getLocalDayKey(message.createdAt)
    items.push(toMessageItem(message, isLastInGroup))
  })

  return items
}

/** Memoizes on input identity so a zustand selector returns a stable array. */
export const createChatListSelector = (now: () => number) => {
  let lastInput: ChatListInput | null = null
  let lastItems: Array<ChatListItem> = []

  return ({ messages, outbox, hasOlder }: ChatListInput) => {
    if (
      messages !== lastInput?.messages ||
      outbox !== lastInput.outbox ||
      hasOlder !== lastInput.hasOlder
    ) {
      lastInput = { messages, outbox, hasOlder }
      lastItems = buildChatListItems(lastInput, now())
    }
    return lastItems
  }
}
