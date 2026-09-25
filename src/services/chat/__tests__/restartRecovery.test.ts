import { STORAGE_NAMES } from '@constants'
import { countVisibleCopies, getLastMessageTexts, getOutboxTexts } from '@testing/chatAssertions'
import { createTestRuntime } from '@testing/createTestRuntime'
import { waitFor } from '@testing/waitFor'

const OFFLINE_TEXTS = ['First while offline', 'Second while offline', 'Third while offline']

describe('recovery after an app restart', () => {
  it('writes a message to disk before showing it as queued', async () => {
    const runtime = createTestRuntime()
    await waitFor(() => runtime.chat.getState().hasLoadedInitialPage, 'first page')
    runtime.devSettings.update({ isOffline: true })

    const result = runtime.chat.sendMessage('Persist me first')

    // Synchronously, before any await: it is already on disk with its clientId.
    const persistedOutbox = runtime.disk.read(STORAGE_NAMES.client, 'outbox.v1') ?? ''
    expect(result.isAccepted).toBe(true)
    expect(result.isAccepted && persistedOutbox.includes(result.clientId)).toBe(true)
    expect(getOutboxTexts(runtime.chat)).toEqual(['Persist me first'])
    runtime.stop()
  })

  it('keeps offline messages waiting across a force-quit, then recovers missed messages and sends each once', async () => {
    let runtime = createTestRuntime()
    await waitFor(() => runtime.chat.getState().hasLoadedInitialPage, 'first page')

    runtime.devSettings.update({ isOffline: true })
    OFFLINE_TEXTS.forEach((text) => runtime.chat.sendMessage(text))
    expect(getOutboxTexts(runtime.chat)).toEqual(OFFLINE_TEXTS)
    const clientIdsBeforeRestart = runtime.chat.getState().outbox.map(({ clientId }) => clientId)

    runtime = runtime.restart()

    // Still offline after relaunch: all three are back, still waiting, same ids.
    const { outbox, connection } = runtime.chat.getState()
    expect(connection).toBe('offline')
    expect(outbox.map(({ text }) => text)).toEqual(OFFLINE_TEXTS)
    expect(outbox.map(({ clientId }) => clientId)).toEqual(clientIdsBeforeRestart)
    expect(outbox.every(({ status, isSending }) => status === 'queued' && !isSending)).toBe(true)

    // The creator writes while this device is offline; the socket never delivers these.
    const incomingTexts = runtime.server.simulateCreatorMessages(4).map(({ text }) => text)

    runtime.devSettings.update({ isOffline: false })
    await waitFor(() => runtime.chat.getState().outbox.length === 0, 'outbox drained')
    await runtime.chat.syncNow()

    // Server order: the missed messages first, then ours in the order they were typed.
    expect(getLastMessageTexts(runtime.chat, 7)).toEqual([...incomingTexts, ...OFFLINE_TEXTS])
    OFFLINE_TEXTS.forEach((text) => {
      expect(runtime.server.countAcceptedWithText(text)).toBe(1)
      expect(countVisibleCopies(runtime.chat, text)).toBe(1)
    })
    const messageIds = runtime.chat.getState().messages.map(({ id }) => id)
    expect(new Set(messageIds).size).toBe(messageIds.length)
    runtime.stop()
  })
})
