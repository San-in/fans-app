import { Pill } from '@components/atoms'
import { PRODUCT_IDS } from '@constants'
import { useAccessState, usePurchasesState } from '@hooks'
import { memo } from 'react'

type AccessPillProps = {
  onPress: () => void
}

/** Access as the backend last confirmed it; a store success alone only reads "Confirming…". */
const AccessPill = ({ onPress }: AccessPillProps) => {
  const status = useAccessState((state) => state.status)
  const isConfirmingSubscription = usePurchasesState(
    ({ flow }) => flow.status === 'verifying' && flow.productId === PRODUCT_IDS.allAccessMonthly
  )

  if (isConfirmingSubscription) {
    return (
      <Pill
        accessibilityHint="Your payment went through; FanSuite is confirming your access"
        isLoading
        label="Confirming access…"
        onPress={onPress}
        tone="warning"
      />
    )
  }
  switch (status) {
    case 'active':
      return <Pill icon="star" label="Fan in All Access" onPress={onPress} tone="accent" />
    case 'expired':
      return (
        <Pill
          icon="alert-circle-outline"
          label="All Access ended"
          onPress={onPress}
          tone="danger"
        />
      )
    default:
      return <Pill icon="star-outline" label="Get All Access" onPress={onPress} tone="outline" />
  }
}

export default memo(AccessPill)
