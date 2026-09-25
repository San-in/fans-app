import { createStore } from 'zustand/vanilla'

import type { FrameStats } from './FrameSampler'

export type PerfResult = FrameStats & {
  runNumber: number
  buildMode: 'development' | 'release'
  platform: string
  durationMs: number
  averageJsFps: number
  minimumJsFps: number
  latencyMs: number
  messagesLoadedBefore: number
  messagesLoadedAfter: number
  jsHeapBeforeMb: number | null
  jsHeapAfterMb: number | null
}

type PerfState = {
  requestedRun: number | null
  isRunning: boolean
  results: ReadonlyArray<PerfResult>
}

/** UI-only coordination between the dev panel (asks) and the chat screen (runs). */
export const perfStore = createStore<PerfState>(() => ({
  requestedRun: null,
  isRunning: false,
  results: [],
}))

export const requestPerfRun = () => {
  const { isRunning, results } = perfStore.getState()
  if (!isRunning) {
    perfStore.setState({ requestedRun: results.length + 1 })
  }
}

type HermesStats = { js_heapSize?: number }
type HermesGlobal = { HermesInternal?: { getInstrumentedStats?: () => HermesStats } }

/** Hermes' JS heap only; native memory needs Xcode / Android Studio. */
export const readJsHeapMb = (): number | null => {
  const heapSize = (globalThis as HermesGlobal).HermesInternal?.getInstrumentedStats?.().js_heapSize
  return typeof heapSize === 'number' ? Math.round((heapSize / 1024 / 1024) * 10) / 10 : null
}

export const formatPerfResult = (result: PerfResult) =>
  [
    `Run #${result.runNumber} · ${result.buildMode} · ${result.platform}`,
    `Duration ${Math.round(result.durationMs / 100) / 10}s · latency ${result.latencyMs}ms`,
    `JS FPS avg ${result.averageJsFps} · min ${result.minimumJsFps}`,
    `JS frames ${result.frames} · dropped ${result.droppedFrames}`,
    `Longest frame ${result.longestFrameMs}ms · p95 ${result.p95FrameMs}ms`,
    `Messages loaded ${result.messagesLoadedBefore} → ${result.messagesLoadedAfter}`,
    `JS heap ${result.jsHeapBeforeMb ?? '?'}MB → ${result.jsHeapAfterMb ?? '?'}MB`,
  ].join('\n')
