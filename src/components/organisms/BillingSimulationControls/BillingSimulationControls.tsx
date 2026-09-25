import { AppText, Button, SegmentedControl, type SegmentedOption } from '@components/atoms'
import { useDevSettingsState, usePurchasesState, useRuntime } from '@hooks'
import { haptics } from '@services/feedback/haptics'
import type { BackendConfirmationSetting, StoreOutcomeSetting } from '@types'
import { memo } from 'react'
import { View } from 'react-native'

import { styles } from './BillingSimulationControls.styles'

const STORE_OPTIONS: ReadonlyArray<SegmentedOption<StoreOutcomeSetting>> = [
  { value: 'success', label: 'Success' },
  { value: 'cancel', label: 'Cancel' },
  { value: 'fail', label: 'Fail' },
]

const BACKEND_OPTIONS: ReadonlyArray<SegmentedOption<BackendConfirmationSetting>> = [
  { value: 'instant', label: 'Instant' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'manual', label: 'Manual' },
  { value: 'reject', label: 'Reject' },
]

/** What the simulated store returns, and how the mock backend treats the receipt. */
const BillingSimulationControls = () => {
  const { runtime } = useRuntime()
  const storeOutcome = useDevSettingsState((state) => state.storeOutcome)
  const backendConfirmation = useDevSettingsState((state) => state.backendConfirmation)
  const pendingCount = usePurchasesState((state) => state.pendingTransactions.length)
  const delaySeconds = Math.round(runtime.config.backendConfirmationDelayMs / 1000)

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <AppText color="textSecondary" variant="captionStrong">
          Store result for the next purchase
        </AppText>
        <SegmentedControl
          accessibilityLabel="Store result for the next purchase"
          onChange={(value) => runtime.devSettings.update({ storeOutcome: value })}
          options={STORE_OPTIONS}
          value={storeOutcome}
        />
      </View>
      <View style={styles.group}>
        <AppText color="textSecondary" variant="captionStrong">
          Backend confirmation
        </AppText>
        <SegmentedControl
          accessibilityLabel="Backend confirmation"
          onChange={(value) => runtime.devSettings.update({ backendConfirmation: value })}
          options={BACKEND_OPTIONS}
          value={backendConfirmation}
        />
        <AppText color="textSecondary" variant="micro">
          {backendConfirmation === 'delayed' &&
            `Confirms ${delaySeconds}s after the store succeeds.`}
          {backendConfirmation === 'manual' && 'Stays pending until you confirm it below.'}
          {backendConfirmation === 'instant' && 'Confirms as soon as the receipt arrives.'}
          {backendConfirmation === 'reject' && 'The backend refuses the receipt.'}
        </AppText>
      </View>
      {pendingCount > 0 && (
        <Button
          icon="checkmark-done"
          label={`Backend: confirm ${pendingCount} pending`}
          onPress={() => {
            haptics.tap()
            runtime.server.simulateConfirmPendingPurchases()
          }}
          size="compact"
          variant="secondary"
        />
      )}
    </View>
  )
}

export default memo(BillingSimulationControls)
