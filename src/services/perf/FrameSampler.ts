const FRAME_BUDGET_MS = 1000 / 60

export type FrameStats = {
  frames: number
  droppedFrames: number
  longestFrameMs: number
  p95FrameMs: number
}

/**
 * Records requestAnimationFrame deltas on the JS thread. A delta of ~2×
 * budget means one frame was dropped. UI-thread drops need the native tools
 * (Perf Monitor, Instruments, Android GPU rendering) — this can't see them.
 */
export class FrameSampler {
  private deltas: Array<number> = []
  private lastTimestamp = 0
  private frameHandle: number | null = null

  public start(): void {
    this.deltas = []
    this.lastTimestamp = performance.now()
    this.frameHandle = requestAnimationFrame(this.onFrame)
  }

  public stop(): FrameStats {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
    const sorted = [...this.deltas].sort((first, second) => first - second)
    const droppedFrames = this.deltas.reduce(
      (total, delta) => total + Math.max(0, Math.round(delta / FRAME_BUDGET_MS) - 1),
      0
    )
    return {
      frames: this.deltas.length,
      droppedFrames,
      longestFrameMs: Math.round(sorted[sorted.length - 1] ?? 0),
      p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    }
  }

  private onFrame = () => {
    const now = performance.now()
    this.deltas.push(now - this.lastTimestamp)
    this.lastTimestamp = now
    this.frameHandle = requestAnimationFrame(this.onFrame)
  }
}
