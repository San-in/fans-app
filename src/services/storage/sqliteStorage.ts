import type { StorageName } from '@constants'
import { SQLiteStorage } from 'expo-sqlite/kv-store'

import type { KeyValueStorage } from './KeyValueStorage'

/**
 * One SQLite file per simulated system (app, mock server, mock store, dev
 * settings), so wiping the app's data never touches what the "server" accepted.
 */
export const createSqliteStorage = (name: StorageName): KeyValueStorage => {
  const database = new SQLiteStorage(`${name}.db`)

  return {
    getString: (key) => database.getItemSync(key),
    setString: (key, value) => database.setItemSync(key, value),
    remove: (key) => {
      database.removeItemSync(key)
    },
    clear: () => {
      database.clearSync()
    },
  }
}
