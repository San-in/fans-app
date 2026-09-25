const POLL_INTERVAL_MS = 2

/** Polls with real timers until `predicate` holds; fails with `description` on timeout. */
export const waitFor = async (
  predicate: () => boolean,
  description: string,
  timeoutMs = 1500
): Promise<void> => {
  const startedAt = Date.now()
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for: ${description}`)
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

/** Lets already-scheduled timers and promise chains run. */
export const settle = (milliseconds = 30) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))
