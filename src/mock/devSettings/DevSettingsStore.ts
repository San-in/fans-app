import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type { DevSettings, SendFault } from '@types'
import { createStore, type StoreApi } from 'zustand/vanilla'

const SETTINGS_KEY = 'settings.v1'

export type DevSettingsState = DevSettings & {
  /** Not persisted: a queued fault is a one-shot for the next send attempts. */
  sendFaults: ReadonlyArray<SendFault>
}

/** The knobs of the simulated world. The app itself never reads these — only the mocks do. */
export class DevSettingsStore {
  public readonly store: StoreApi<DevSettingsState>

  constructor(
    private readonly storage: KeyValueStorage,
    defaults: DevSettings
  ) {
    const persisted = readJson<Partial<DevSettings>>(storage, SETTINGS_KEY, {})
    this.store = createStore<DevSettingsState>(() => ({
      ...defaults,
      ...persisted,
      sendFaults: [],
    }))
  }

  public getState(): DevSettingsState {
    return this.store.getState()
  }

  public update(patch: Partial<DevSettings>): void {
    this.store.setState(patch)
    const { sendFaults: _sendFaults, ...settings } = this.store.getState()
    writeJson(this.storage, SETTINGS_KEY, settings)
  }

  public enqueueSendFault(fault: SendFault): void {
    this.store.setState(({ sendFaults }) => ({ sendFaults: [...sendFaults, fault] }))
  }

  public takeSendFault(): SendFault | null {
    const [nextFault, ...remainingFaults] = this.store.getState().sendFaults
    if (!nextFault) {
      return null
    }
    this.store.setState({ sendFaults: remainingFaults })
    return nextFault
  }

  public clearSendFaults(): void {
    this.store.setState({ sendFaults: [] })
  }
}
