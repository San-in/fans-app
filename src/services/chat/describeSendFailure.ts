import type { ApiErrorCode, SendFailure } from '@types'

export type SendErrorKind = 'offline' | 'transient' | 'permanent'

export const classifySendError = (code: ApiErrorCode | null): SendErrorKind => {
  switch (code) {
    case 'NETWORK_OFFLINE':
      return 'offline'
    case 'VALIDATION_FAILED':
    case 'QUOTA_EXCEEDED':
      return 'permanent'
    default:
      return 'transient'
  }
}

/** Copy for a failed bubble. Transient failures say retrying is safe — idempotency makes it true. */
export const describeSendFailure = (
  code: ApiErrorCode | null,
  serverMessage: string
): SendFailure => {
  switch (code) {
    case 'TIMEOUT':
      return {
        code,
        message: 'No response from the server. Retrying is safe — it won’t send twice.',
        action: 'retry',
      }
    case 'SERVER_ERROR':
      return { code, message: 'The server had a problem delivering this message.', action: 'retry' }
    case 'RATE_LIMITED':
      return {
        code,
        message: 'You’re sending too fast. Wait a moment, then retry.',
        action: 'retry',
      }
    case 'VALIDATION_FAILED':
      return { code, message: serverMessage, action: 'edit' }
    case 'QUOTA_EXCEEDED':
      return { code, message: serverMessage, action: 'getAccess' }
    default:
      return { code: 'UNKNOWN', message: 'Something went wrong while sending.', action: 'retry' }
  }
}
