import { AppText } from '@components/atoms/AppText'
import { memo } from 'react'
import { View } from 'react-native'

import { styles } from './Avatar.styles'
import type { AvatarProps } from './Avatar.types'

const Avatar = ({ initials, size = 36 }: AvatarProps) => (
  <View
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[styles.container, { borderRadius: size / 2, height: size, width: size }]}
  >
    <AppText color="textOnAccent" maxFontSizeMultiplier={1} variant="captionStrong">
      {initials}
    </AppText>
  </View>
)

export default memo(Avatar)
