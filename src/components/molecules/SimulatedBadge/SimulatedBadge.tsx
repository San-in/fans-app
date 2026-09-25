import { AppText } from '@components/atoms'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@theme'
import { memo } from 'react'
import { View } from 'react-native'

import { styles } from './SimulatedBadge.styles'
import type { SimulatedBadgeProps } from './SimulatedBadge.types'

/** Makes it impossible to mistake the mock store for real billing — on screen and in recordings. */
const SimulatedBadge = ({ label = 'Simulated billing · no real charges' }: SimulatedBadgeProps) => (
  <View accessibilityLabel={label} accessibilityRole="text" style={styles.container}>
    <Ionicons color={COLORS.warning} name="flask-outline" size={14} />
    <AppText color="warning" variant="captionStrong">
      {label}
    </AppText>
  </View>
)

export default memo(SimulatedBadge)
