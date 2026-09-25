import type { NetworkOperation, NetworkSimulator } from '@mock/network/NetworkSimulator'
import type { MockServer } from '@mock/server/MockServer'
import type {
  AccessDto,
  MessagePageDto,
  RestorePurchasesResponse,
  SendMessageRequest,
  SendMessageResponse,
  StoreTransaction,
  VerifyPurchaseResponse,
} from '@types'
import { createApiError } from '@types'
import { withTimeout } from '@utils'

/** The app's view of the backend — the only door to the server that production code uses. */
export type ServerApi = {
  getLatestMessages: (limit: number) => Promise<MessagePageDto>
  getMessagesBefore: (beforeSeq: number, limit: number) => Promise<MessagePageDto>
  getMessagesAfter: (afterSeq: number, limit: number) => Promise<MessagePageDto>
  sendMessage: (request: SendMessageRequest) => Promise<SendMessageResponse>
  getAccess: () => Promise<AccessDto>
  verifyPurchase: (transaction: StoreTransaction) => Promise<VerifyPurchaseResponse>
  restorePurchases: (
    transactions: ReadonlyArray<StoreTransaction>
  ) => Promise<RestorePurchasesResponse>
}

type ServerApiDependencies = {
  server: MockServer
  network: NetworkSimulator
  timeoutMs: number
}

export const createServerApi = ({
  server,
  network,
  timeoutMs,
}: ServerApiDependencies): ServerApi => {
  const call = <T>(operation: NetworkOperation, handler: () => T, clientId?: string) =>
    withTimeout(network.request(operation, handler, { clientId }), timeoutMs, () =>
      createApiError('TIMEOUT', `${operation} timed out after ${timeoutMs}ms.`)
    )

  return {
    getLatestMessages: (limit) => call('getLatestMessages', () => server.getLatestMessages(limit)),
    getMessagesBefore: (beforeSeq, limit) =>
      call('getMessagesBefore', () => server.getMessagesBefore(beforeSeq, limit)),
    getMessagesAfter: (afterSeq, limit) =>
      call('getMessagesAfter', () => server.getMessagesAfter(afterSeq, limit)),
    sendMessage: (request) =>
      call('sendMessage', () => server.sendMessage(request), request.clientId),
    getAccess: () => call('getAccess', () => server.getAccess()),
    verifyPurchase: (transaction) =>
      call('verifyPurchase', () => server.verifyPurchase(transaction)),
    restorePurchases: (transactions) =>
      call('restorePurchases', () => server.restorePurchases(transactions)),
  }
}
