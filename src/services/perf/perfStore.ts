import { createStore } from 'zustand/vanilla'

import type { FrameStats, SampledFrames } from './FrameSampler'

export const BENCHMARK_PHASES = ['scrollUp', 'typing', 'scrollDown'] as const
export type BenchmarkPhase = (typeof BENCHMARK_PHASES)[number]

/**
 * How far before the top of the loaded history the list asks for the next page, in screens.
 * 4 is the fix: at ½ a fast fling reached the top in ~0.1 s while a page takes ~350 ms, so the
 * list stopped and waited. Keep it below one page's height (~50 short bubbles), or after a
 * prepend the list is still inside the start zone and FlashList won't ask again. ½ stays
 * selectable in the dev panel so before and after are measured in the same build.
 */
export const PREFETCH_SCREENS_OPTIONS = [0.5, 4] as const
export type PrefetchScreens = (typeof PREFETCH_SCREENS_OPTIONS)[number]

export type PerfResult = SampledFrames<BenchmarkPhase> & {
  runNumber: number
  buildMode: 'development' | 'release'
  platform: string
  durationMs: number
  averageJsFps: number
  minimumJsFps: number
  latencyMs: number
  prefetchScreens: PrefetchScreens
  /** Started right after "Reset everything" (one page loaded) — only such runs compare. */
  isFreshStart: boolean
  /** Time the scroll-up spent pinned at the top of the window, waiting for the next page. */
  waitingAtTopMs: number
  messagesLoadedBefore: number
  messagesLoadedAfter: number
  jsHeapBeforeMb: number | null
  jsHeapAfterMb: number | null
}

type PerfState = {
  requestedRun: number | null
  isRunning: boolean
  results: ReadonlyArray<PerfResult>
  prefetchScreens: PrefetchScreens
}

/**
 * UI-only coordination between the dev panel (asks) and the chat screen (runs). Lives
 * outside the runtime, so "Reset everything" between runs keeps the chosen variant.
 */
export const perfStore = createStore<PerfState>(() => ({
  requestedRun: null,
  isRunning: false,
  results: [],
  prefetchScreens: 4,
}))

export const setPrefetchScreens = (prefetchScreens: PrefetchScreens) =>
  perfStore.setState({ prefetchScreens })

export const formatPrefetchScreens = (prefetchScreens: PrefetchScreens) =>
  prefetchScreens === 0.5 ? '½ screen' : `${prefetchScreens} screens`

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

const PHASE_TITLES: Record<BenchmarkPhase, string> = {
  scrollUp: 'Scroll up',
  typing: 'Typing',
  scrollDown: 'Scroll down',
}

const formatPhase = (phase: BenchmarkPhase, { droppedFrames, longestFrameMs }: FrameStats) =>
  `${PHASE_TITLES[phase]}: dropped ${droppedFrames} · longest ${longestFrameMs}ms`

export const formatPerfResult = (result: PerfResult) =>
  [
    ...(result.isFreshStart ? [] : ['⚠️ Not from a fresh reset — not comparable']),
    `Run #${result.runNumber} · ${result.buildMode} · ${result.platform}`,
    `Prefetch ${formatPrefetchScreens(result.prefetchScreens)} ahead · latency ${result.latencyMs}ms`,
    `Duration ${Math.round(result.durationMs / 100) / 10}s`,
    `JS FPS avg ${result.averageJsFps} · min ${result.minimumJsFps}`,
    `JS frames ${result.frames} · dropped ${result.droppedFrames}`,
    `Longest frame ${result.longestFrameMs}ms · p95 ${result.p95FrameMs}ms`,
    ...BENCHMARK_PHASES.map((phase) => formatPhase(phase, result.phases[phase])),
    `Waiting at the top for a page: ${result.waitingAtTopMs}ms`,
    `Messages loaded ${result.messagesLoadedBefore} → ${result.messagesLoadedAfter}`,
    `JS heap ${result.jsHeapBeforeMb ?? '?'}MB → ${result.jsHeapAfterMb ?? '?'}MB`,
  ].join('\n')
