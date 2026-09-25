import type { ChatEngine } from '@services/chat/ChatEngine'

/** How many times a text is visible in the thread — confirmed bubbles plus pending ones. */
export const countVisibleCopies = (chat: ChatEngine, text: string) => {
  const { messages, outbox } = chat.getState()
  return (
    messages.filter((message) => message.text === text).length +
    outbox.filter((item) => item.text === text).length
  )
}

export const getOutboxTexts = (chat: ChatEngine) => chat.getState().outbox.map(({ text }) => text)

export const getLastMessageTexts = (chat: ChatEngine, count: number) =>
  chat
    .getState()
    .messages.slice(-count)
    .map(({ text }) => text)
