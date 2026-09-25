import { createRuntime, type Runtime } from '@services/runtime/createRuntime'
import { createMemoryDisk, type MemoryDisk } from '@services/storage'
import type { DevSettings } from '@types'

type TestRuntimeOptions = {
  disk?: MemoryDisk
  devSettings?: Partial<DevSettings>
}

export type TestRuntime = Runtime & {
  disk: MemoryDisk
  /** Simulates a force-quit and relaunch: the old runtime dies, a new one boots from the same disk. */
  restart: () => TestRuntime
}

let idCounter = 0
const createTestId = () => {
  idCounter += 1
  return `id-${idCounter}`
}

/** Same object graph as the app, with in-memory storage and millisecond timings. */
export const createTestRuntime = ({
  disk = createMemoryDisk(),
  devSettings = {},
}: TestRuntimeOptions = {}): TestRuntime => {
  const runtime = createRuntime({
    openStorage: (name) => disk.open(name),
    createId: createTestId,
    config: {
      requestTimeoutMs: 60,
      retryBaseDelayMs: 5,
      retryMaxDelayMs: 20,
      maxAutoSendAttempts: 3,
      realtimeConnectDelayMs: 0,
      storeSheetDelayMs: 0,
      backendConfirmationDelayMs: 40,
      purchasePollIntervalMs: 10,
      threadCacheWriteDelayMs: 0,
      defaultDevSettings: {
        latencyMs: 0,
        backendConfirmation: 'instant',
        ...devSettings,
      },
    },
  })
  runtime.start()

  return {
    ...runtime,
    disk,
    restart: () => {
      runtime.stop()
      return createTestRuntime({ disk })
    },
  }
}
