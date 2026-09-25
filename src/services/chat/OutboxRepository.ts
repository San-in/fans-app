import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type { OutboxItem, OutboxRecord } from '@types'

const OUTBOX_KEY = 'outbox.v1'
const LOCAL_ORDER_KEY = 'outbox.localOrder.v1'

const toRecord = ({
  clientId,
  text,
  localOrder,
  createdAt,
  attempts,
  status,
  failure,
}: OutboxRecord | OutboxItem): OutboxRecord => ({
  clientId,
  text,
  localOrder,
  createdAt,
  attempts,
  status,
  failure,
})

/** The client's pending queue on disk. Kept apart from anything the server stores. */
export class OutboxRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  public load(): Array<OutboxRecord> {
    return readJson<Array<OutboxRecord>>(this.storage, OUTBOX_KEY, [])
      .filter(({ clientId, text }) => Boolean(clientId) && typeof text === 'string')
      .sort((first, second) => first.localOrder - second.localOrder)
  }

  public save(items: ReadonlyArray<OutboxRecord | OutboxItem>): void {
    writeJson(this.storage, OUTBOX_KEY, items.map(toRecord))
  }

  /** Persisted, so local order stays monotonic across restarts even when the queue drains. */
  public takeNextLocalOrder(): number {
    const nextLocalOrder = Number(this.storage.getString(LOCAL_ORDER_KEY) ?? '0') + 1
    this.storage.setString(LOCAL_ORDER_KEY, String(nextLocalOrder))
    return nextLocalOrder
  }
}
