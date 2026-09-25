export const CURRENT_USER_ID = 'fan_me'

export const CREATOR = {
  id: 'creator_ethan',
  displayName: 'Ethan Shoots',
  handle: '@ethan_shoots',
  initials: 'ES',
} as const

export const MESSAGE_MAX_LENGTH = 400
export const FREE_MESSAGE_LIMIT = 10

// The mock history is generated from a fixed seed and a fixed end date so every
// run (and every profiling pass) scrolls through exactly the same 50,000 rows.
export const HISTORY_SIZE = 50_000
export const HISTORY_SEED = 20_260_924
export const HISTORY_END_AT = Date.UTC(2026, 8, 20, 18, 0, 0)
export const HISTORY_INTERVAL_MS = 47_000

export const MESSAGE_PAGE_SIZE = 50
export const CATCH_UP_PAGE_SIZE = 100
export const MAX_CATCH_UP_PAGES = 20
export const THREAD_CACHE_SIZE = 200

export const PRODUCT_IDS = {
  allAccessMonthly: 'fansuite.allaccess.monthly',
  gift: 'fansuite.gift.small',
} as const

export const ALL_ACCESS_PERIOD_MS = 30 * 24 * 60 * 60 * 1000

export const STORAGE_NAMES = {
  client: 'fanschat-client',
  server: 'mock-server',
  appStore: 'mock-app-store',
  devSettings: 'dev-settings',
} as const

export type StorageName = (typeof STORAGE_NAMES)[keyof typeof STORAGE_NAMES]
