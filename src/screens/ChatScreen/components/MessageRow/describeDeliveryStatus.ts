import type { Ionicons } from '@expo/vector-icons'
import type { ColorName } from '@theme'
import type { ConnectionStatus, OutboxItem } from '@types'
import type { ComponentProps } from 'react'

export type DeliveryStatus = {
  label: string
  icon: ComponentProps<typeof Ionicons>['name'] | null
  isBusy: boolean
  color: ColorName
}

export const SENT_STATUS: DeliveryStatus = {
  label: 'Sent',
  icon: 'checkmark',
  isBusy: false,
  color: 'textSecondary',
}

/** One readable line per state: the user should always know whether to wait or act. */
export const describeDeliveryStatus = (
  { status, isSending, nextRetryAt }: OutboxItem,
  connection: ConnectionStatus
): DeliveryStatus => {
  if (status === 'failed') {
    return { label: 'Not sent', icon: 'alert-circle', isBusy: false, color: 'danger' }
  }
  if (isSending) {
    return { label: 'Sending…', icon: null, isBusy: true, color: 'textSecondary' }
  }
  if (connection === 'offline') {
    return { label: 'Waiting for network', icon: 'time-outline', isBusy: false, color: 'warning' }
  }
  if (nextRetryAt !== null) {
    return { label: 'Retrying…', icon: 'refresh', isBusy: false, color: 'warning' }
  }
  return { label: 'Waiting to send', icon: 'time-outline', isBusy: false, color: 'textSecondary' }
}
