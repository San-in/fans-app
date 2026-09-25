import { AppText, Avatar, Button, IconButton } from '@components/atoms'
import { SectionCard, SimulatedBadge } from '@components/molecules'
import { BillingSimulationControls } from '@components/organisms'
import { CREATOR, FREE_MESSAGE_LIMIT, PRODUCT_IDS } from '@constants'
import { Ionicons } from '@expo/vector-icons'
import { useAccessState, usePurchasesState, useRuntime } from '@hooks'
import type { RootStackScreenProps, ROUTES } from '@navigation/RootStack'
import { haptics } from '@services/feedback/haptics'
import { COLORS } from '@theme'
import { useCallback, useEffect } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { describePaywallStatus, TONE_COLOR } from './describePaywallStatus'
import { styles } from './PaywallScreen.styles'

const BENEFITS = [
  { icon: 'chatbubbles-outline', text: 'Unlimited messages with Ethan' },
  { icon: 'flash-outline', text: 'Priority replies' },
  { icon: 'play-circle-outline', text: 'Every exclusive post and video' },
] as const

const PaywallScreen = ({ navigation }: RootStackScreenProps<typeof ROUTES.paywall>) => {
  const { runtime } = useRuntime()
  const { bottom } = useSafeAreaInsets()
  const products = usePurchasesState((state) => state.products)
  const productsStatus = usePurchasesState((state) => state.productsStatus)
  const flow = usePurchasesState((state) => state.flow)
  const lastOutcome = usePurchasesState((state) => state.lastOutcome)
  const pendingError = usePurchasesState(
    ({ pendingTransactions }) => pendingTransactions[0]?.lastError ?? null
  )
  const accessStatus = useAccessState((state) => state.status)
  const entitlement = useAccessState((state) => state.entitlement)

  const product = products.find(({ id }) => id === PRODUCT_IDS.allAccessMonthly)
  const isActive = accessStatus === 'active'
  const isBusy = flow.status !== 'idle'
  const isPurchasing =
    flow.status === 'purchasing' && flow.productId === PRODUCT_IDS.allAccessMonthly
  const isVerifying = flow.status === 'verifying' && flow.productId === PRODUCT_IDS.allAccessMonthly
  const status = describePaywallStatus({
    flow,
    lastOutcome,
    accessStatus,
    entitlement,
    pendingError,
  })

  useEffect(() => {
    if (productsStatus === 'error') {
      void runtime.purchases.loadProducts()
    }
  }, [productsStatus, runtime])

  // A finished outcome belongs to this visit only.
  useEffect(() => () => runtime.purchases.dismissOutcome(), [runtime])

  const handleSubscribe = useCallback(() => {
    haptics.tap()
    void runtime.purchases.purchase(PRODUCT_IDS.allAccessMonthly)
  }, [runtime])

  const handleRestore = useCallback(() => {
    void runtime.purchases.restore()
  }, [runtime])

  const priceLabel = product ? `${product.displayPrice}/${product.periodLabel ?? 'month'}` : ''
  let ctaLabel = product ? `Subscribe · ${priceLabel}` : 'Subscribe'
  if (isActive) {
    ctaLabel = 'You’re in All Access'
  } else if (isPurchasing) {
    ctaLabel = 'Waiting for the store…'
  } else if (isVerifying) {
    ctaLabel = 'Confirming your access…'
  } else if (accessStatus === 'expired' && product) {
    ctaLabel = `Renew · ${priceLabel}`
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <SimulatedBadge />
        <IconButton accessibilityLabel="Close" icon="close" onPress={navigation.goBack} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Avatar initials={CREATOR.initials} size={64} />
          <AppText accessibilityRole="header" align="center" variant="title">
            All Access to {CREATOR.displayName}
          </AppText>
          <AppText align="center" color="textSecondary">
            Free fans get {FREE_MESSAGE_LIMIT} messages. All Access removes the limit.
          </AppText>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map(({ icon, text }) => (
            <View key={text} style={styles.benefitRow}>
              <Ionicons color={COLORS.accent} name={icon} size={20} />
              <AppText>{text}</AppText>
            </View>
          ))}
        </View>

        <View style={[styles.planCard, isActive && styles.planCardActive]}>
          {product ? (
            <>
              <View style={styles.planText}>
                <AppText variant="bodyStrong">{product.title} · Monthly</AppText>
                <AppText color="textSecondary" variant="caption">
                  Renews monthly. Cancel anytime in store settings.
                </AppText>
              </View>
              <AppText color="accent" variant="heading">
                {priceLabel}
              </AppText>
            </>
          ) : (
            <View style={styles.planLoading}>
              {productsStatus === 'error' ? (
                <AppText color="danger" variant="caption">
                  Couldn’t load the price from the store.
                </AppText>
              ) : (
                <ActivityIndicator color={COLORS.accent} />
              )}
            </View>
          )}
        </View>

        {status && (
          <Animated.View
            key={status.title}
            accessibilityLiveRegion="polite"
            entering={FadeIn.reduceMotion(ReduceMotion.System)}
            style={[styles.statusCard, styles[`status_${status.tone}`]]}
          >
            {status.isBusy ? (
              <ActivityIndicator color={COLORS[TONE_COLOR[status.tone]]} />
            ) : (
              status.icon && (
                <Ionicons color={COLORS[TONE_COLOR[status.tone]]} name={status.icon} size={20} />
              )
            )}
            <View style={styles.statusText}>
              <AppText color={TONE_COLOR[status.tone]} variant="bodyStrong">
                {status.title}
              </AppText>
              <AppText color="textSecondary" variant="caption">
                {status.body}
              </AppText>
            </View>
          </Animated.View>
        )}

        <View style={styles.actions}>
          <Button
            accessibilityHint="Opens the simulated store payment sheet"
            icon={isActive ? 'star' : undefined}
            isDisabled={isBusy || isActive || !product}
            isLoading={isPurchasing || isVerifying}
            label={ctaLabel}
            onPress={handleSubscribe}
          />
          <Button
            isDisabled={isBusy}
            isLoading={flow.status === 'restoring'}
            label="Restore purchases"
            onPress={handleRestore}
            variant="ghost"
          />
        </View>

        <SectionCard
          description="Only for this demo: choose what the fake store and the mock backend do next."
          title="Simulation"
        >
          <BillingSimulationControls />
        </SectionCard>

        <AppText align="center" color="textSecondary" variant="micro">
          Simulated billing: no App Store or Google Play account is used and nothing is charged.
          Access unlocks only after the mock FanSuite backend confirms the purchase.
        </AppText>
      </ScrollView>
    </View>
  )
}

export default PaywallScreen
