import { FREE_MESSAGE_LIMIT, HISTORY_SIZE, STORAGE_NAMES } from '@constants'
import { DevSettingsStore } from '@mock/devSettings/DevSettingsStore'
import { MockServer } from '@mock/server/MockServer'
import { DEFAULT_RUNTIME_CONFIG } from '@services/runtime/config'
import { createMemoryDisk, type MemoryDisk } from '@services/storage'

const createServer = (disk: MemoryDisk = createMemoryDisk()) =>
  new MockServer({
    storage: disk.open(STORAGE_NAMES.server),
    devSettings: new DevSettingsStore(
      disk.open(STORAGE_NAMES.devSettings),
      DEFAULT_RUNTIME_CONFIG.defaultDevSettings
    ),
    now: Date.now,
    confirmationDelayMs: 0,
  })

describe('MockServer', () => {
  it('returns the original message when the same clientId is sent again', () => {
    const server = createServer()

    const first = server.sendMessage({ clientId: 'client-1', text: 'hello' })
    const retry = server.sendMessage({ clientId: 'client-1', text: 'hello' })

    expect(first.wasDuplicate).toBe(false)
    expect(retry.wasDuplicate).toBe(true)
    expect(retry.message).toEqual(first.message)
    expect(server.countAcceptedWithText('hello')).toBe(1)
    expect(retry.quota.remaining).toBe(FREE_MESSAGE_LIMIT - 1)
  })

  it('keeps accepted messages and their clientIds across a restart', () => {
    const disk = createMemoryDisk()
    const { message } = createServer(disk).sendMessage({ clientId: 'client-1', text: 'kept' })

    const restartedServer = createServer(disk)
    const retry = restartedServer.sendMessage({ clientId: 'client-1', text: 'kept' })

    expect(retry.wasDuplicate).toBe(true)
    expect(retry.message.seq).toBe(message.seq)
    expect(restartedServer.getLatestMessages(1).messages[0]?.text).toBe('kept')
  })

  it('pages through a deterministic 50,000-message history without gaps', () => {
    const server = createServer()

    const latest = server.getLatestMessages(50)
    expect(latest.messages).toHaveLength(50)
    expect(latest.messages[49]?.seq).toBe(HISTORY_SIZE)
    expect(latest.hasMore).toBe(true)

    const older = server.getMessagesBefore(latest.messages[0]?.seq ?? 0, 50)
    expect(older.messages[49]?.seq).toBe((latest.messages[0]?.seq ?? 0) - 1)

    const first = server.getMessagesBefore(3, 50)
    expect(first.messages.map(({ seq }) => seq)).toEqual([1, 2])
    expect(first.hasMore).toBe(false)

    expect(createServer().getLatestMessages(50)).toEqual(latest)
  })

  it('assigns increasing seqs after the history', () => {
    const server = createServer()
    const incoming = server.simulateCreatorMessages(2)
    const { message } = server.sendMessage({ clientId: 'client-1', text: 'mine' })

    expect(incoming.map(({ seq }) => seq)).toEqual([HISTORY_SIZE + 1, HISTORY_SIZE + 2])
    expect(message.seq).toBe(HISTORY_SIZE + 3)
    expect(server.getMessagesAfter(HISTORY_SIZE, 10).messages).toHaveLength(3)
  })
})
