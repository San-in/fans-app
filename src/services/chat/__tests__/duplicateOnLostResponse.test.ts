import { countVisibleCopies } from '@testing/chatAssertions'
import { createTestRuntime } from '@testing/createTestRuntime'
import { waitFor } from '@testing/waitFor'

/**
 * The reported bug: a send reaches the server, the response is lost, the user
 * retries and sees the message twice.
 *
 * `npm test` runs this against the fixed client and it passes.
 * `npm run test:duplicate-bug` flips on the legacy retry path (a new id per
 * attempt, as the original code did) and the same assertions fail with 2 copies.
 */
const isReproducingBug = process.env.REPRODUCE_DUPLICATE_BUG === '1'

describe('a send whose response is lost', () => {
  it('ends with exactly one copy after the retry', async () => {
    const runtime = createTestRuntime({
      devSettings: { legacyDuplicateBug: isReproducingBug },
    })
    await waitFor(() => runtime.chat.getState().hasLoadedInitialPage, 'first page')

    runtime.devSettings.enqueueSendFault('loseResponse')
    runtime.chat.sendMessage('Did you get this?')

    // Accepted on the server, but the client only sees a timeout.
    await waitFor(
      () => runtime.server.countAcceptedWithText('Did you get this?') >= 1,
      'server accepted the first attempt'
    )
    expect(runtime.chat.getState().outbox).toHaveLength(1)

    // The client retries on its own after the timeout.
    await waitFor(() => runtime.chat.getState().outbox.length === 0, 'retry confirmed')
    await runtime.chat.syncNow()

    expect(runtime.server.countAcceptedWithText('Did you get this?')).toBe(1)
    expect(countVisibleCopies(runtime.chat, 'Did you get this?')).toBe(1)
    runtime.stop()
  })

  it('ends with exactly one copy when the app is killed before it could retry', async () => {
    let runtime = createTestRuntime({
      devSettings: { legacyDuplicateBug: isReproducingBug },
    })
    await waitFor(() => runtime.chat.getState().hasLoadedInitialPage, 'first page')

    runtime.devSettings.enqueueSendFault('loseResponse')
    runtime.chat.sendMessage('Sent right before a force-quit')
    await waitFor(
      () => runtime.server.countAcceptedWithText('Sent right before a force-quit') === 1,
      'server accepted it'
    )

    runtime = runtime.restart()
    await waitFor(() => runtime.chat.getState().outbox.length === 0, 'outbox reconciled')
    await runtime.chat.syncNow()

    expect(runtime.server.countAcceptedWithText('Sent right before a force-quit')).toBe(1)
    expect(countVisibleCopies(runtime.chat, 'Sent right before a force-quit')).toBe(1)
    runtime.stop()
  })
})
