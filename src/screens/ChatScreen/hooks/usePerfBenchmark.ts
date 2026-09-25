import { MESSAGE_PAGE_SIZE } from '@constants'
import { useRuntime } from '@hooks'
import { dismissToast, showToast } from '@services/feedback/toast'
import { FrameSampler } from '@services/perf/FrameSampler'
import {
  BENCHMARK_PHASES,
  type BenchmarkPhase,
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

const PHASE_LABELS: Record<BenchmarkPhase, string> = {
  scrollUp: 'scrolling up through the history…',
  typing: 'typing (nothing is sent)…',
  scrollDown: 'scrolling back down…',
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type UsePerfBenchmarkOptions = {
  listRef: RefObject<MessageListHandle | null>
  composerRef: RefObject<ComposerHandle | null>
}

/**
 * A repeatable scroll-and-type sequence: fling up through the 50k history
 * (pages load as it goes), type a sentence, fling back down. Same steps and
 * same deterministic history every run, so before/after numbers compare —
 * as long as each run starts right after "Reset everything" (flagged if not).
 */
export const usePerfBenchmark = ({ listRef, composerRef }: UsePerfBenchmarkOptions) => {
  const { runtime } = useRuntime()

  useEffect(() => {
    /** Returns how long the list sat at the top of the loaded window, waiting for a page. */
    const scrollBy = async (frames: number, stepPx: number) => {
      let waitingAtTopMs = 0
      let requestedOffset: number | null = null
      let reportedOffset: number | null = null
      let anchorKey: string | null = null
      let previousFrameAt = performance.now()
      for (let frame = 0; frame < frames; frame += 1) {
        const list = listRef.current
        if (!list) {
          break
        }
        const isPinnedAtTop = requestedOffset === 0 && runtime.chat.getState().hasOlder
        let isWaiting = false
        if (isPinnedAtTop) {
          // Like a finger at the top: no scrolling while the page loads. Once it lands the
          // list keeps the old top message in place; continue from where it now sits. The
          // scroll event for that shift can be throttled away, so the reported offset isn't
          // trusted here — pushing from a stale 0 would throw the list back to the top.
          anchorKey = anchorKey ?? list.getTopMessageKey()
          const anchorOffset = anchorKey === null ? null : list.getItemOffset(anchorKey)
          if (anchorOffset !== null && anchorOffset > 0) {
            requestedOffset = anchorOffset
            reportedOffset = list.getScrollOffset()
            anchorKey = null
          } else {
            isWaiting = true
          }
        } else {
          // Scroll events are throttled, so the reported offset can be a frame old. Build on
          // our own last request unless the list reported a new one — a steady step per frame.
          const currentOffset = list.getScrollOffset()
          const baseOffset =
            requestedOffset !== null && currentOffset === reportedOffset
              ? requestedOffset
              : currentOffset
          reportedOffset = currentOffset
          requestedOffset = Math.max(0, baseOffset + stepPx)
          list.scrollToOffset(requestedOffset)
        }
        await nextFrame()

        const frameAt = performance.now()
        if (isWaiting) {
          waitingAtTopMs += frameAt - previousFrameAt
        }
        previousFrameAt = frameAt
      }
      return Math.round(waitingAtTopMs)
    }

    const announce = (runNumber: number, text: string) =>
      showToast(`Benchmark run ${runNumber}: ${text}`, { durationMs: null })

    const run = async (runNumber: number) => {
      perfStore.setState({ isRunning: true, requestedRun: null })
      announce(runNumber, 'starting — don’t touch the screen…')
      listRef.current?.scrollToLatest()
      await delay(SETTLE_BEFORE_START_MS)

      const messagesLoadedBefore = runtime.chat.getState().messages.length
      const jsHeapBeforeMb = readJsHeapMb()
      const sampler = new FrameSampler<BenchmarkPhase>(BENCHMARK_PHASES)
      const fpsMonitor = new JSFPSMonitor()
      const startPhase = (phase: BenchmarkPhase) => {
        sampler.setPhase(phase)
        announce(runNumber, PHASE_LABELS[phase])
      }
      const startedAt = Date.now()
      sampler.start()
      fpsMonitor.startTracking()

      startPhase('scrollUp')
      const waitingAtTopMs = await scrollBy(SCROLL_UP_FRAMES, -SCROLL_STEP_PX)
      startPhase('typing')
      for (let length = 1; length <= TYPED_TEXT.length; length += 1) {
        composerRef.current?.setText(TYPED_TEXT.slice(0, length))
        await delay(KEYSTROKE_INTERVAL_MS)
      }
      startPhase('scrollDown')
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
        isFreshStart: messagesLoadedBefore === MESSAGE_PAGE_SIZE,
        waitingAtTopMs,
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
