const FRAME_BUDGET_MS = 1000 / 60

export type FrameStats = {
  frames: number
  droppedFrames: number
  longestFrameMs: number
  p95FrameMs: number
}

export type SampledFrames<TPhase extends string> = FrameStats & {
  phases: Record<TPhase, FrameStats>
}

const summarize = (deltas: ReadonlyArray<number>): FrameStats => {
  const sorted = [...deltas].sort((first, second) => first - second)
  const droppedFrames = deltas.reduce(
    (total, delta) => total + Math.max(0, Math.round(delta / FRAME_BUDGET_MS) - 1),
    0
  )
  return {
    frames: deltas.length,
    droppedFrames,
    longestFrameMs: Math.round(sorted[sorted.length - 1] ?? 0),
    p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
  }
}

/**
 * Records requestAnimationFrame deltas on the JS thread, overall and per phase,
 * so a slow frame can be traced to what the benchmark was doing. A delta of ~2×
 * budget means one frame was dropped. UI-thread drops need the native tools
 * (Instruments, Android gfxinfo) — this can't see them.
 */
export class FrameSampler<TPhase extends string> {
  private deltas: Array<number> = []
  private phaseDeltas = new Map<TPhase, Array<number>>()
  private currentPhase: TPhase
  private lastTimestamp = 0
  private frameHandle: number | null = null

  constructor(private readonly phases: ReadonlyArray<TPhase>) {
    const [firstPhase] = phases
    if (firstPhase === undefined) {
      throw new Error('FrameSampler needs at least one phase')
    }
    this.currentPhase = firstPhase
  }

  public start(): void {
    this.deltas = []
    this.phaseDeltas = new Map(this.phases.map((phase) => [phase, []]))
    this.lastTimestamp = performance.now()
    this.frameHandle = requestAnimationFrame(this.onFrame)
  }

  public setPhase(phase: TPhase): void {
    this.currentPhase = phase
  }

  public stop(): SampledFrames<TPhase> {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
    const phases = Object.fromEntries(
      this.phases.map((phase) => [phase, summarize(this.phaseDeltas.get(phase) ?? [])])
    ) as Record<TPhase, FrameStats>
    return { ...summarize(this.deltas), phases }
  }

  private onFrame = () => {
    const now = performance.now()
    const delta = now - this.lastTimestamp
    this.deltas.push(delta)
    this.phaseDeltas.get(this.currentPhase)?.push(delta)
    this.lastTimestamp = now
    this.frameHandle = requestAnimationFrame(this.onFrame)
  }
}
