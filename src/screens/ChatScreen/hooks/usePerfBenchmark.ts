import { useRuntime } from '@hooks'
import { dismissToast, showToast } from '@services/feedback/toast'
import { FrameSampler } from '@services/perf/FrameSampler'
import {
  formatPerfResult,
  type PerfResult,
  perfStore,
  readJsHeapMb,
} from '@services/perf/perfStore'
import { JSFPSMonitor } from '@shopify/flash-list'
import { delay } from '@utils'
import { type RefObject, useEffect } from 'react'
import { Alert, Platform } from 'react-native'

import type { ComposerHandle } from '../components/Composer'
import type { MessageListHandle } from '../components/MessageList'

const SETTLE_BEFORE_START_MS = 900
const SCROLL_UP_FRAMES = 240
const SCROLL_DOWN_FRAMES = 120
const SCROLL_STEP_PX = 80
const TYPED_TEXT = 'Typing while older history keeps paging in — does it stay smooth?'
const KEYSTROKE_INTERVAL_MS = 35

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type UsePerfBenchmarkOptions = {
  listRef: RefObject<MessageListHandle | null>
  composerRef: RefObject<ComposerHandle | null>
}

/**
 * A repeatable scroll-and-type sequence: fling up through the 50k history
 * (pages load as it goes), type a sentence, fling back down. Same steps and
 * same deterministic history every run, so before/after numbers compare.
 */
export const usePerfBenchmark = ({ listRef, composerRef }: UsePerfBenchmarkOptions) => {
  const { runtime } = useRuntime()

  useEffect(() => {
    const scrollBy = async (frames: number, stepPx: number) => {
      for (let frame = 0; frame < frames; frame += 1) {
        const list = listRef.current
        if (!list) {
          return
        }
        list.scrollToOffset(Math.max(0, list.getScrollOffset() + stepPx))
        await nextFrame()
      }
    }

    // Sticky toasts name the current phase, so a tester knows it's running and what it does.
    const announcePhase = (runNumber: number, phase: string) =>
      showToast(`Benchmark run ${runNumber}: ${phase}`, { durationMs: null })

    const run = async (runNumber: number) => {
      perfStore.setState({ isRunning: true, requestedRun: null })
      announcePhase(runNumber, 'starting — don’t touch the screen…')
      await delay(SETTLE_BEFORE_START_MS)

      const messagesLoadedBefore = runtime.chat.getState().messages.length
      const jsHeapBeforeMb = readJsHeapMb()
      const sampler = new FrameSampler()
      const fpsMonitor = new JSFPSMonitor()
      const startedAt = Date.now()
      sampler.start()
      fpsMonitor.startTracking()

      announcePhase(runNumber, 'scrolling up through the history…')
      await scrollBy(SCROLL_UP_FRAMES, -SCROLL_STEP_PX)
      announcePhase(runNumber, 'typing (nothing is sent)…')
      for (let length = 1; length <= TYPED_TEXT.length; length += 1) {
        composerRef.current?.setText(TYPED_TEXT.slice(0, length))
        await delay(KEYSTROKE_INTERVAL_MS)
      }
      announcePhase(runNumber, 'scrolling back down…')
      await scrollBy(SCROLL_DOWN_FRAMES, SCROLL_STEP_PX * 2)
      listRef.current?.scrollToLatest()
      composerRef.current?.setText('')

      const frameStats = sampler.stop()
      const jsFps = fpsMonitor.stopAndGetData()
      const result: PerfResult = {
        ...frameStats,
        runNumber,
        buildMode: __DEV__ ? 'development' : 'release',
        platform: `${Platform.OS} ${String(Platform.Version)}`,
        durationMs: Date.now() - startedAt,
        averageJsFps: jsFps.averageFPS,
        minimumJsFps: jsFps.minFPS,
        latencyMs: runtime.devSettings.getState().latencyMs,
        messagesLoadedBefore,
        messagesLoadedAfter: runtime.chat.getState().messages.length,
        jsHeapBeforeMb,
        jsHeapAfterMb: readJsHeapMb(),
      }

      dismissToast()
      perfStore.setState(({ results }) => ({ isRunning: false, results: [result, ...results] }))
      console.info(`[perf] ${JSON.stringify(result)}`)
      Alert.alert('Benchmark finished', formatPerfResult(result))
    }

    return perfStore.subscribe(({ requestedRun, isRunning }) => {
      if (requestedRun !== null && !isRunning) {
        void run(requestedRun)
      }
    })
  }, [composerRef, listRef, runtime])
}
