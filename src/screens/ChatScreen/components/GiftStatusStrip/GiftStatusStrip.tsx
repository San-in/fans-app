import { AppText, IconButton } from '@components/atoms'
import { CREATOR, PRODUCT_IDS } from '@constants'
import { Ionicons } from '@expo/vector-icons'
import { usePurchasesState, useRuntime } from '@hooks'
import { type ColorName, COLORS } from '@theme'
import type { PurchaseOutcome } from '@types'
import { memo, useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated'

import { styles } from './GiftStatusStrip.styles'

const AUTO_DISMISS_MS = 4000

type StripContent = {
  text: string
  color: ColorName
  isBusy: boolean
  canDismiss: boolean
}

const isGiftOutcome = (outcome: PurchaseOutcome | null) =>
  Boolean(outcome && 'productId' in outcome && outcome.productId === PRODUCT_IDS.gift)

const describeOutcome = (outcome: PurchaseOutcome): StripContent | null => {
  switch (outcome.type) {
    case 'purchased':
      return {
        text: `Gift sent to ${CREATOR.displayName}!`,
        color: 'success',
        isBusy: false,
        canDismiss: true,
      }
    case 'cancelled':
      return {
        text: 'Gift cancelled — you weren’t charged.',
        color: 'textSecondary',
        isBusy: false,
        canDismiss: true,
      }
    case 'failed':
      return {
        text: `Gift not sent: ${outcome.message}`,
        color: 'danger',
        isBusy: false,
        canDismiss: true,
      }
    case 'rejected':
      return {
        text: `We couldn’t verify the gift payment. ${outcome.message}`,
        color: 'danger',
        isBusy: false,
        canDismiss: true,
      }
    default:
      return null
  }
}

/** Gift purchases happen in place, so their honest in-between states live above the composer. */
const GiftStatusStrip = () => {
  const { runtime } = useRuntime()
  const flow = usePurchasesState((state) => state.flow)
  const lastOutcome = usePurchasesState((state) => state.lastOutcome)

  const isGiftFlow =
    (flow.status === 'purchasing' || flow.status === 'verifying') &&
    flow.productId === PRODUCT_IDS.gift
  const giftOutcome = isGiftOutcome(lastOutcome) ? lastOutcome : null

  useEffect(() => {
    if (giftOutcome?.type !== 'purchased' && giftOutcome?.type !== 'cancelled') {
      return undefined
    }
    const timeoutId = setTimeout(() => runtime.purchases.dismissOutcome(), AUTO_DISMISS_MS)
    return () => clearTimeout(timeoutId)
  }, [giftOutcome, runtime])

  let content: StripContent | null = null
  if (isGiftFlow) {
    content = {
      text:
        flow.status === 'purchasing'
          ? 'Waiting for the store…'
          : 'Payment received. Waiting for FanSuite to confirm your gift…',
      color: 'accent',
      isBusy: true,
      canDismiss: false,
    }
  } else if (giftOutcome) {
    content = describeOutcome(giftOutcome)
  }
  if (!content) {
    return null
  }

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={FadeIn.reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.reduceMotion(ReduceMotion.System)}
      style={styles.container}
    >
      {content.isBusy ? (
        <ActivityIndicator color={COLORS.accent} size="small" />
      ) : (
        <Ionicons color={COLORS[content.color]} name="gift-outline" size={18} />
      )}
      <View style={styles.text}>
        <AppText color={content.color} variant="caption">
          {content.text}
        </AppText>
      </View>
      {content.canDismiss && (
        <IconButton
          accessibilityLabel="Dismiss"
          icon="close"
          onPress={() => runtime.purchases.dismissOutcome()}
        />
      )}
    </Animated.View>
  )
}

export default memo(GiftStatusStrip)
