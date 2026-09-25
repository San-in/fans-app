import { THREAD_CACHE_SIZE } from '@constants'
import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type { MessageDto } from '@types'

const THREAD_CACHE_KEY = 'thread.cache.v1'

/**
 * Best-effort copy of the newest confirmed messages so the thread renders
 * instantly (and offline) after a restart. Losing it is harmless — the
 * server is the source of truth and a catch-up refills it.
 */
export class ThreadCache {
  constructor(private readonly storage: KeyValueStorage) {}

  public load(): Array<MessageDto> {
    return readJson<Array<MessageDto>>(this.storage, THREAD_CACHE_KEY, [])
  }

  public save(messages: ReadonlyArray<MessageDto>): void {
    writeJson(this.storage, THREAD_CACHE_KEY, messages.slice(-THREAD_CACHE_SIZE))
  }
}
