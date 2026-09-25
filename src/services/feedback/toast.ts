import { createStore } from 'zustand/vanilla'

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger'

export type Toast = {
  id: number
  message: string
  tone: ToastTone
  /** `null` keeps the toast until it is replaced or dismissed. */
  durationMs: number | null
}

type ToastState = { current: Toast | null }

const DEFAULT_DURATION_MS = 2800

/**
 * One toast at a time; a new one replaces the current. Lives outside the
 * runtime so a toast survives "Reset everything" (which swaps the runtime).
 */
export const toastStore = createStore<ToastState>(() => ({ current: null }))

let nextToastId = 1

export const showToast = (
  message: string,
  {
    tone = 'neutral',
    durationMs = DEFAULT_DURATION_MS,
  }: { tone?: ToastTone; durationMs?: number | null } = {}
) => {
  const toast: Toast = { id: nextToastId, message, tone, durationMs }
  nextToastId += 1
  toastStore.setState({ current: toast })
  return toast.id
}

export const dismissToast = (id?: number) => {
  const { current } = toastStore.getState()
  if (current && (id === undefined || current.id === id)) {
    toastStore.setState({ current: null })
  }
}
