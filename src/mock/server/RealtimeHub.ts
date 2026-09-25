import type { RealtimeEvent } from '@types'

/** Server side of the socket: fans out events to whoever is connected right now. */
export class RealtimeHub {
  private readonly listeners = new Set<(event: RealtimeEvent) => void>()

  public subscribe(listener: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public publish(event: RealtimeEvent): void {
    Array.from(this.listeners).forEach((listener) => listener(event))
  }
}
