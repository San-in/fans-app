import { CREATOR } from '@constants'
import { buildChatListItems } from '@services/chat/buildChatListItems'
import type { MessageDto } from '@types'

const NOW = new Date(2026, 8, 20, 18, 0).getTime()
const MINUTE_MS = 60_000

const createMessage = (seq: number, createdAt: number): MessageDto => ({
  id: `m${seq}`,
  seq,
  clientId: null,
  authorId: CREATOR.id,
  kind: 'text',
  text: `message ${seq}`,
  createdAt,
})

/** Rows as the list renders them: day labels and message seqs. */
const describeRows = (messages: ReadonlyArray<MessageDto>, hasOlder: boolean) =>
  buildChatListItems({ messages, outbox: [], hasOlder }, NOW).map((item) => {
    if (item.type === 'day') {
      return item.label
    }
    return item.type === 'message' ? item.message.seq : item.item.clientId
  })

describe('buildChatListItems', () => {
  // Earlier messages of the same day may still be above; a separator there would be a guess.
  it('shows no day separator above the oldest loaded message while older history remains', () => {
    const today = [createMessage(51, NOW - 2 * MINUTE_MS), createMessage(52, NOW - MINUTE_MS)]

    expect(describeRows(today, true)).toEqual([51, 52])
  })

  it('shows the separator where a day really starts, and at the start of the history', () => {
    const yesterday = NOW - 24 * 60 * MINUTE_MS
    const messages = [
      createMessage(1, yesterday),
      createMessage(2, NOW - MINUTE_MS),
      createMessage(3, NOW),
    ]

    expect(describeRows(messages, true)).toEqual([1, 'Today', 2, 3])
    expect(describeRows(messages, false)).toEqual(['Yesterday', 1, 'Today', 2, 3])
  })
})
