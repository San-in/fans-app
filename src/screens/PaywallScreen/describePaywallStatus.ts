import { PRODUCT_IDS } from '@constants'
import type { Ionicons } from '@expo/vector-icons'
import type { ColorName } from '@theme'
import type { AccessStatus, EntitlementDto, PurchaseFlow, PurchaseOutcome } from '@types'
import { formatLongDate } from '@utils'
import type { ComponentProps } from 'react'

export type PaywallStatus = {
  tone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
  icon: ComponentProps<typeof Ionicons>['name'] | null
  isBusy: boolean
  title: string
  body: string
}

type PaywallStatusInput = {
  flow: PurchaseFlow
  lastOutcome: PurchaseOutcome | null
  accessStatus: AccessStatus
  entitlement: EntitlementDto | null
  pendingError: string | null
}

export const TONE_COLOR: Record<PaywallStatus['tone'], ColorName> = {
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'textSecondary',
}

const isGiftOutcome = (outcome: PurchaseOutcome) =>
  'productId' in outcome && outcome.productId === PRODUCT_IDS.gift

/**
 * One card that always says what happened and what happens next. The
 * in-between state is explicit: "the store charged you" is not "you have access".
 */
export const describePaywallStatus = ({
  flow,
  lastOutcome,
  accessStatus,
  entitlement,
  pendingError,
}: PaywallStatusInput): PaywallStatus | null => {
  const renewalDate = entitlement ? formatLongDate(entitlement.expiresAt) : ''

  if (flow.status === 'verifying' && flow.productId === PRODUCT_IDS.allAccessMonthly) {
    return {
      tone: 'accent',
      icon: null,
      isBusy: true,
      title: 'Payment received — confirming your access',
      body:
        pendingError ??
        'The store reports your payment went through. All Access unlocks as soon as FanSuite confirms it. You can close this screen; we’ll keep checking.',
    }
  }

  if (lastOutcome && !isGiftOutcome(lastOutcome)) {
    switch (lastOutcome.type) {
      case 'purchased':
        return {
          tone: 'success',
          icon: 'checkmark-circle',
          isBusy: false,
          title: 'Welcome to All Access!',
          body: `Unlimited messages are on. Renews on ${renewalDate}.`,
        }
      case 'cancelled':
        return {
          tone: 'neutral',
          icon: 'close-circle-outline',
          isBusy: false,
          title: 'Purchase cancelled',
          body: 'You weren’t charged.',
        }
      case 'failed':
        return {
          tone: 'danger',
          icon: 'alert-circle',
          isBusy: false,
          title: 'Payment didn’t go through',
          body:
            accessStatus === 'active'
              ? `${lastOutcome.message} Your All Access is still active.`
              : `${lastOutcome.message} Nothing was charged — you can try again.`,
        }
      case 'rejected':
        return {
          tone: 'danger',
          icon: 'alert-circle',
          isBusy: false,
          title: 'We couldn’t verify this purchase',
          body: `${lastOutcome.message} If you were charged, tap Restore purchases.`,
        }
      case 'restored':
        return {
          tone: 'success',
          icon: 'checkmark-circle',
          isBusy: false,
          title: 'Purchase restored',
          body: `All Access is active until ${renewalDate}.`,
        }
      case 'restoredExpired':
        return {
          tone: 'warning',
          icon: 'time-outline',
          isBusy: false,
          title: 'Your subscription has ended',
          body: `We found your All Access, but it expired on ${renewalDate}. Subscribe again to continue.`,
        }
      case 'nothingToRestore':
        return {
          tone: 'neutral',
          icon: 'search-outline',
          isBusy: false,
          title: 'Nothing to restore',
          body: 'No All Access subscription was found for this store account.',
        }
      case 'restoreFailed':
        return {
          tone: 'danger',
          icon: 'alert-circle',
          isBusy: false,
          title: 'Restore failed',
          body: lastOutcome.message,
        }
    }
  }

  if (accessStatus === 'active') {
    return {
      tone: 'success',
      icon: 'star',
      isBusy: false,
      title: 'You’re a Fan in All Access',
      body: `Renews on ${renewalDate}.`,
    }
  }
  if (accessStatus === 'expired') {
    return {
      tone: 'warning',
      icon: 'time-outline',
      isBusy: false,
      title: 'All Access has ended',
      body: `It expired on ${renewalDate}. Your free messages still work.`,
    }
  }
  return null
}
