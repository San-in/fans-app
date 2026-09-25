import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type { PendingTransaction } from '@types'

const PENDING_TRANSACTIONS_KEY = 'billing.pendingTransactions.v1'

/** Store transactions the backend hasn't confirmed yet — the purchase equivalent of the outbox. */
export class PendingTransactionsRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  public load(): Array<PendingTransaction> {
    return readJson<Array<PendingTransaction>>(this.storage, PENDING_TRANSACTIONS_KEY, [])
  }

  public save(transactions: ReadonlyArray<PendingTransaction>): void {
    writeJson(this.storage, PENDING_TRANSACTIONS_KEY, transactions)
  }
}
