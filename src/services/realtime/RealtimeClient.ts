import type { DevSettingsStore } from '@mock/devSettings/DevSettingsStore'
import type { NetworkSimulator } from '@mock/network/NetworkSimulator'
import type { MockServer } from '@mock/server/MockServer'
import type { RealtimeEvent } from '@types'
import { cloneForWire } from '@utils'

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected'

type RealtimeClientDependencies = {
  server: Pick<MockServer, 'subscribe'>
  network: NetworkSimulator
  devSettings: DevSettingsStore
  connectDelayMs: number
}

const REPEATED_EVENT_DELAY_MS = 120

/**
 * The app's socket. Like a real WebSocket it only hears events while
 * connected — anything published while offline is simply never delivered,
 * which is why the chat engine always catches up by cursor after reconnecting.
 */
export class RealtimeClient {
  private status: RealtimeStatus = 'disconnected'
  private readonly statusListeners = new Set<(status: RealtimeStatus) => void>()
  private readonly eventListeners = new Set<(event: RealtimeEvent) => void>()
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()
  private unsubscribeServer: (() => void) | null = null
  private unsubscribeNetwork: (() => void) | null = null

  constructor(private readonly deps: RealtimeClientDependencies) {}

  public start(): void {
    if (this.unsubscribeNetwork) {
      return
    }
    this.unsubscribeNetwork = this.deps.network.subscribe((isOnline) =>
      isOnline ? this.connect() : this.disconnect()
    )
    if (this.deps.network.isOnline()) {
      this.connect()
    }
  }

  public stop(): void {
    this.unsubscribeNetwork?.()
    this.unsubscribeNetwork = null
    this.disconnect()
  }

  public getStatus(): RealtimeStatus {
    return this.status
  }

  public onStatusChange(listener: (status: RealtimeStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  public onEvent(listener: (event: RealtimeEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  private connect(): void {
    if (this.status !== 'disconnected') {
      return
    }
    this.setStatus('connecting')
    this.schedule(() => {
      if (!this.deps.network.isOnline() || this.status !== 'connecting') {
        return
      }
      this.unsubscribeServer = this.deps.server.subscribe(this.handleServerEvent)
      this.setStatus('connected')
    }, this.deps.connectDelayMs)
  }

  private disconnect(): void {
    this.timers.forEach((timerId) => clearTimeout(timerId))
    this.timers.clear()
    this.unsubscribeServer?.()
    this.unsubscribeServer = null
    this.setStatus('disconnected')
  }

  private handleServerEvent = (event: RealtimeEvent) => {
    const { clientId } = event.type === 'message.created' ? event.message : { clientId: null }
    if (clientId && this.deps.network.consumeEchoSuppression(clientId)) {
      return
    }
    const { latencyMs, repeatEvents } = this.deps.devSettings.getState()
    this.deliverLater(event, latencyMs / 2)
    if (repeatEvents) {
      this.deliverLater(event, latencyMs / 2 + REPEATED_EVENT_DELAY_MS)
    }
  }

  private deliverLater(event: RealtimeEvent, delayMs: number): void {
    const wireEvent = cloneForWire(event)
    this.schedule(() => {
      if (this.status === 'connected') {
        this.eventListeners.forEach((listener) => listener(wireEvent))
      }
    }, delayMs)
  }

  private schedule(callback: () => void, delayMs: number): void {
    const timerId = setTimeout(() => {
      this.timers.delete(timerId)
      callback()
    }, delayMs)
    this.timers.add(timerId)
  }

  private setStatus(status: RealtimeStatus): void {
    if (status === this.status) {
      return
    }
    this.status = status
    this.statusListeners.forEach((listener) => listener(status))
  }
}
