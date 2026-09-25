import { AppText } from '@components/atoms'
import { useAccessState } from '@hooks'
import { memo } from 'react'
import { Pressable, View } from 'react-native'

import { styles } from './Composer.styles'

type QuotaLabelProps = {
  onOpenPaywall: () => void
}

/** The design's "Available messages" line — the fan's paid-access state at a glance. */
const QuotaLabel = ({ onOpenPaywall }: QuotaLabelProps) => {
  const status = useAccessState((state) => state.status)
  const remaining = useAccessState((state) => state.quota?.remaining ?? null)

  if (status === 'active') {
    return (
      <View style={styles.quotaRow}>
        <AppText color="textSecondary" variant="micro">
          Available messages:{' '}
        </AppText>
        <AppText color="accent" variant="micro">
          Unlimited
        </AppText>
      </View>
    )
  }
  if (remaining === 0) {
    return (
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onOpenPaywall}>
        <AppText color="accent" variant="micro">
          No free messages left · Get All Access
        </AppText>
      </Pressable>
    )
  }
  return (
    <AppText color="textSecondary" variant="micro">
      Available messages: {remaining === null ? '—' : remaining}
    </AppText>
  )
}

export default memo(QuotaLabel)
