import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@theme'
import { memo } from 'react'
import { Pressable } from 'react-native'

import { styles } from './IconButton.styles'
import type { IconButtonProps } from './IconButton.types'

const ICON_SIZE = 20
const HIT_SLOP = 6

const IconButton = ({
  icon,
  variant = 'plain',
  isDisabled = false,
  style,
  ...props
}: IconButtonProps) => {
  let iconColor: string = variant === 'primary' ? COLORS.textOnAccent : COLORS.accent
  if (variant === 'plain') {
    iconColor = COLORS.textPrimary
  }
  if (isDisabled) {
    iconColor = COLORS.disabled
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && variant !== 'plain' && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      <Ionicons color={iconColor} name={icon} size={ICON_SIZE} />
    </Pressable>
  )
}

export default memo(IconButton)
