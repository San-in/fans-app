import { AppText } from '@components/atoms/AppText'
import { Ionicons } from '@expo/vector-icons'
import { type ColorName, COLORS } from '@theme'
import { memo } from 'react'
import { ActivityIndicator, Pressable } from 'react-native'

import { styles } from './Pill.styles'
import type { PillProps, PillTone } from './Pill.types'

const TONE_COLOR: Record<PillTone, ColorName> = {
  accent: 'accent',
  outline: 'accent',
  warning: 'warning',
  danger: 'danger',
  success: 'success',
  neutral: 'textSecondary',
}

const Pill = ({
  label,
  tone = 'accent',
  icon,
  isLoading = false,
  onPress,
  ...props
}: PillProps) => {
  const color = TONE_COLOR[tone]
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[tone], pressed && styles.pressed]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS[color]} size="small" />
      ) : (
        icon && <Ionicons color={COLORS[color]} name={icon} size={14} />
      )}
      <AppText color={color} maxFontSizeMultiplier={1.3} variant="captionStrong">
        {label}
      </AppText>
    </Pressable>
  )
}

export default memo(Pill)
