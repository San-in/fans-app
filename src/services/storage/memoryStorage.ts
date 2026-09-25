import type { StorageName } from '@constants'

import type { KeyValueStorage } from './KeyValueStorage'

export type MemoryDisk = {
  open: (name: StorageName) => KeyValueStorage
  /** Raw contents of one database — lets tests assert on what actually hit "disk". */
  read: (name: StorageName, key: string) => string | null
}

/**
 * In-memory stand-in for the SQLite files. The disk outlives any runtime built
 * on top of it, so a test "restarts the app" by stopping one runtime and
 * creating another over the same disk.
 */
export const createMemoryDisk = (): MemoryDisk => {
  const databases = new Map<StorageName, Map<string, string>>()

  const getDatabase = (name: StorageName) => {
    const existing = databases.get(name)
    if (existing) {
      return existing
    }
    const created = new Map<string, string>()
    databases.set(name, created)
    return created
  }

  return {
    open: (name) => {
      const database = getDatabase(name)
      return {
        getString: (key) => database.get(key) ?? null,
        setString: (key, value) => {
          database.set(key, value)
        },
        remove: (key) => {
          database.delete(key)
        },
        clear: () => database.clear(),
      }
    },
    read: (name, key) => getDatabase(name).get(key) ?? null,
  }
}
