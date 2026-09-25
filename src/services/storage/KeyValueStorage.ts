/**
 * Synchronous on purpose: when `setString` returns, the value is committed.
 * That is what lets the outbox persist a message *before* the UI shows it as
 * queued — there is no window where a force-quit loses an acknowledged send.
 */
export type KeyValueStorage = {
  getString: (key: string) => string | null
  setString: (key: string, value: string) => void
  remove: (key: string) => void
  clear: () => void
}

export const readJson = <T>(storage: KeyValueStorage, key: string, fallback: T): T => {
  const raw = storage.getString(key)
  if (raw === null) {
    return fallback
  }
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`Discarding unreadable value for "${key}"`, error)
    return fallback
  }
}

export const writeJson = (storage: KeyValueStorage, key: string, value: unknown) =>
  storage.setString(key, JSON.stringify(value))
