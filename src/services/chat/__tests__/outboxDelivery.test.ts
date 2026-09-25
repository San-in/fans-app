import { FREE_MESSAGE_LIMIT } from '@constants'
import { countVisibleCopies, getLastMessageTexts } from '@testing/chatAssertions'
import { createTestRuntime, type TestRuntime } from '@testing/createTestRuntime'
import { settle, waitFor } from '@testing/waitFor'

const startRuntime = async (options?: Parameters<typeof createTestRuntime>[0]) => {
  const runtime = createTestRuntime(options)
  await waitFor(() => runtime.chat.getState().hasLoadedInitialPage, 'first page')
  return runtime
}

const findOutboxItem = (runtime: TestRuntime, text: string) =>
  runtime.chat.getState().outbox.find((item) => item.text === text)

describe('outbox delivery', () => {
  it('keeps local order when the head of the queue needs a retry', async () => {
    const runtime = await startRuntime()
    runtime.devSettings.enqueueSendFault('serverError')

    runtime.chat.sendMessage('one')
    runtime.chat.sendMessage('two')
    runtime.chat.sendMessage('three')
    await waitFor(() => runtime.chat.getState().outbox.length === 0, 'outbox drained')

    expect(getLastMessageTexts(runtime.chat, 3)).toEqual(['one', 'two', 'three'])
    runtime.stop()
  })

  it('ignores repeated realtime deliveries', async () => {
    const runtime = await startRuntime({ devSettings: { repeatEvents: true } })

    runtime.server.simulateCreatorMessages(2)
    runtime.chat.sendMessage('echoed twice')
    await waitFor(() => runtime.chat.getState().outbox.length === 0, 'outbox drained')
    await settle(200)

    const { messages } = runtime.chat.getState()
    const ids = messages.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(countVisibleCopies(runtime.chat, 'echoed twice')).toBe(1)
    runtime.stop()
  })

  it('gives up after the automatic attempts, keeps the text and lets the user retry once', async () => {
    const runtime = await startRuntime()
    runtime.devSettings.enqueueSendFault('serverError')
    runtime.devSettings.enqueueSendFault('serverError')
    runtime.devSettings.enqueueSendFault('serverError')

    runtime.chat.sendMessage('stubborn message')
    await waitFor(
      () => findOutboxItem(runtime, 'stubborn message')?.status === 'failed',
      'marked as failed'
    )
    expect(findOutboxItem(runtime, 'stubborn message')?.failure?.action).toBe('retry')

    const clientId = findOutboxItem(runtime, 'stubborn message')?.clientId ?? ''
    runtime.chat.retryMessage(clientId)
    await waitFor(() => runtime.chat.getState().outbox.length === 0, 'retry delivered')

    expect(runtime.server.countAcceptedWithText('stubborn message')).toBe(1)
    runtime.stop()
  })

  it('explains a rejected message instead of retrying it, and hands the text back for editing', async () => {
    const runtime = await startRuntime()

    runtime.chat.sendMessage('watch this https://example.com/video')
    await waitFor(
      () => findOutboxItem(runtime, 'watch this https://example.com/video')?.status === 'failed',
      'rejected'
    )
    const item = findOutboxItem(runtime, 'watch this https://example.com/video')
    expect(item?.failure?.action).toBe('edit')
    expect(item?.failure?.message).toMatch(/links/i)

    expect(runtime.chat.takeMessageForEditing(item?.clientId ?? '')).toBe(
      'watch this https://example.com/video'
    )
    expect(runtime.chat.getState().outbox).toHaveLength(0)
    runtime.stop()
  })

  it('stops at the free message limit and asks for All Access', async () => {
    const runtime = await startRuntime()

    for (let index = 1; index <= FREE_MESSAGE_LIMIT + 1; index += 1) {
      runtime.chat.sendMessage(`free message ${index}`)
    }
    const lastText = `free message ${FREE_MESSAGE_LIMIT + 1}`
    await waitFor(() => findOutboxItem(runtime, lastText)?.status === 'failed', 'quota hit')

    expect(runtime.chat.getState().outbox).toHaveLength(1)
    expect(findOutboxItem(runtime, lastText)?.failure?.action).toBe('getAccess')
    expect(runtime.access.store.getState().quota?.remaining).toBe(0)
    runtime.stop()
  })
})
