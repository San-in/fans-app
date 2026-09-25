import { STORAGE_NAMES, type StorageName } from '@constants'
import { MockAppStore } from '@mock/appStore/MockAppStore'
import { DevSettingsStore } from '@mock/devSettings/DevSettingsStore'
import { NetworkSimulator } from '@mock/network/NetworkSimulator'
import { MockServer } from '@mock/server/MockServer'
import { AccessService } from '@services/access/AccessService'
import { createServerApi, type ServerApi } from '@services/api/createServerApi'
import { PurchaseManager } from '@services/billing/PurchaseManager'
import { ChatEngine } from '@services/chat/ChatEngine'
import { RealtimeClient } from '@services/realtime/RealtimeClient'
import type { KeyValueStorage } from '@services/storage'
import type { DevSettings } from '@types'

import { DEFAULT_RUNTIME_CONFIG, type RuntimeConfig } from './config'

type RuntimeOptions = {
  openStorage: (name: StorageName) => KeyValueStorage
  createId: () => string
  now?: () => number
  config?: Partial<Omit<RuntimeConfig, 'defaultDevSettings'>> & {
    defaultDevSettings?: Partial<DevSettings>
  }
}

export type Runtime = {
  id: string
  config: RuntimeConfig
  devSettings: DevSettingsStore
  network: NetworkSimulator
  server: MockServer
  appStore: MockAppStore
  api: ServerApi
  realtime: RealtimeClient
  access: AccessService
  chat: ChatEngine
  purchases: PurchaseManager
  start: () => void
  /** Stops every timer and continuation, as if the process was killed. */
  stop: () => void
  /** Wipes all four databases. Only meaningful on a stopped runtime. */
  wipeAllData: () => void
}

/**
 * Wires the simulated world (dev settings, network, server, store) to the
 * app's services. The app and the tests build exactly the same graph; tests
 * just pass in-memory storage and shorter timings.
 */
export const createRuntime = ({
  openStorage,
  createId,
  now = Date.now,
  config: configOverrides = {},
}: RuntimeOptions): Runtime => {
  const config: RuntimeConfig = {
    ...DEFAULT_RUNTIME_CONFIG,
    ...configOverrides,
    defaultDevSettings: {
      ...DEFAULT_RUNTIME_CONFIG.defaultDevSettings,
      ...configOverrides.defaultDevSettings,
    },
  }
  const storages = {
    client: openStorage(STORAGE_NAMES.client),
    server: openStorage(STORAGE_NAMES.server),
    appStore: openStorage(STORAGE_NAMES.appStore),
    devSettings: openStorage(STORAGE_NAMES.devSettings),
  }

  const devSettings = new DevSettingsStore(storages.devSettings, config.defaultDevSettings)
  const network = new NetworkSimulator(devSettings)
  const server = new MockServer({
    storage: storages.server,
    devSettings,
    now,
    confirmationDelayMs: config.backendConfirmationDelayMs,
  })
  const appStore = new MockAppStore({
    storage: storages.appStore,
    devSettings,
    now,
    createId,
    sheetDelayMs: config.storeSheetDelayMs,
  })

  const api = createServerApi({ server, network, timeoutMs: config.requestTimeoutMs })
  const realtime = new RealtimeClient({
    server,
    network,
    devSettings,
    connectDelayMs: config.realtimeConnectDelayMs,
  })
  const access = new AccessService({ api, realtime, storage: storages.client, now })
  const chat = new ChatEngine({
    api,
    realtime,
    connectivity: network,
    access,
    storage: storages.client,
    config,
    createClientId: createId,
    now,
    isLegacyDuplicateBugEnabled: () => devSettings.getState().legacyDuplicateBug,
  })
  const purchases = new PurchaseManager({
    appStore,
    api,
    access,
    realtime,
    connectivity: network,
    storage: storages.client,
    config,
    now,
  })

  return {
    id: createId(),
    config,
    devSettings,
    network,
    server,
    appStore,
    api,
    realtime,
    access,
    chat,
    purchases,
    start: () => {
      server.start()
      realtime.start()
      access.start()
      chat.start()
      purchases.start()
    },
    stop: () => {
      purchases.stop()
      chat.stop()
      access.stop()
      realtime.stop()
      appStore.stop()
      server.stop()
      network.dispose()
    },
    wipeAllData: () => {
      Object.values(storages).forEach((storage) => storage.clear())
    },
  }
}
