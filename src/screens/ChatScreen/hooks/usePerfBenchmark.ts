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

/**
 * Where the benchmark holds the list, like a finger that stays on a row across phases:
 * the offset it asked for, and the row that was at the top of the screen then.
 */
type Finger = {
  targetOffset: number
  anchor: { key: string; offset: number } | null
}

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
    /** Returns how long the scroll-up sat at the top of the loaded history, waiting for a page. */
    const scrollBy = async (finger: Finger, frames: number, stepPx: number) => {
      let waitingAtTopMs = 0
      let previousFrameAt = performance.now()
      for (let frame = 0; frame < frames; frame += 1) {
        const list = listRef.current
        if (!list) {
          break
        }
        // Drive the offset instead of reading it back: FlashList drops scroll events for
        // 100 ms after it shifts the list for a prepended page, so the reported offset can be
        // a page stale. If rows above the screen changed height (a page landed, even while
        // typing, or estimates got measured), the row on screen moved — move with it.
        const { anchor } = finger
        const anchorOffset = anchor ? list.getItemOffset(anchor.key) : null
        if (anchor && anchorOffset !== null) {
          finger.targetOffset += anchorOffset - anchor.offset
        }
        // At the top with more history to come: the page hasn't landed yet, this frame is lost.
        const isWaiting =
          stepPx < 0 && finger.targetOffset === 0 && runtime.chat.getState().hasOlder
        finger.targetOffset = Math.max(0, finger.targetOffset + stepPx)
        list.scrollToOffset(finger.targetOffset)
        finger.anchor = list.getAnchorAt(finger.targetOffset)
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
      // Settled with no page in flight, so the reported offset is current — the last time it's read.
      const startOffset = listRef.current?.getScrollOffset() ?? 0
      const finger: Finger = {
        targetOffset: startOffset,
        anchor: listRef.current?.getAnchorAt(startOffset) ?? null,
      }
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
      const waitingAtTopMs = await scrollBy(finger, SCROLL_UP_FRAMES, -SCROLL_STEP_PX)
      startPhase('typing')
      for (let length = 1; length <= TYPED_TEXT.length; length += 1) {
        composerRef.current?.setText(TYPED_TEXT.slice(0, length))
        await delay(KEYSTROKE_INTERVAL_MS)
      }
      startPhase('scrollDown')
      await scrollBy(finger, SCROLL_DOWN_FRAMES, SCROLL_STEP_PX * 2)
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
        prefetchScreens: perfStore.getState().prefetchScreens,
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
