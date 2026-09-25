type BackoffOptions = {
  attempt: number
  baseDelayMs: number
  maxDelayMs: number
  retryAfterMs?: number | null
  random?: () => number
}

/** Exponential backoff with ±20% jitter; a server `Retry-After` wins when it is longer. */
export const computeBackoffDelay = ({
  attempt,
  baseDelayMs,
  maxDelayMs,
  retryAfterMs = null,
  random = Math.random,
}: BackoffOptions) => {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1))
  const jittered = exponential * (0.8 + random() * 0.4)
  return Math.round(Math.max(jittered, retryAfterMs ?? 0))
}
