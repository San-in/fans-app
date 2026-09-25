import type { StoreTransaction } from '@types'
import { hashString } from '@utils'

// Shared by the simulated store (signs) and the mock backend (verifies), the
// way Apple/Google sign receipts that only a server can validate.
const STORE_SIGNING_SECRET = 'simulated-store-signing-secret'

type ReceiptPayload = Omit<StoreTransaction, 'receipt'>

type SignedReceipt = {
  payload: ReceiptPayload
  signature: string
}

const sign = (payload: ReceiptPayload) =>
  hashString(`${STORE_SIGNING_SECRET}:${JSON.stringify(payload)}`)

export const signReceipt = (payload: ReceiptPayload): string =>
  JSON.stringify({ payload, signature: sign(payload) } satisfies SignedReceipt)

export const isReceiptValid = ({ receipt, ...transaction }: StoreTransaction): boolean => {
  try {
    const { payload, signature } = JSON.parse(receipt) as SignedReceipt
    return (
      signature === sign(payload) &&
      payload.transactionId === transaction.transactionId &&
      payload.originalTransactionId === transaction.originalTransactionId &&
      payload.productId === transaction.productId &&
      payload.purchasedAt === transaction.purchasedAt
    )
  } catch {
    return false
  }
}
