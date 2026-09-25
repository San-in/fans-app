import { AppText } from '@components/atoms/AppText'
import { Ionicons } from '@expo/vector-icons'
import { type ColorName, COLORS } from '@theme'
import { memo } from 'react'
import { ActivityIndicator, Pressable } from 'react-native'

import { styles } from './Button.styles'
import type { ButtonProps, ButtonVariant } from './Button.types'

const LABEL_COLOR: Record<ButtonVariant, ColorName> = {
  primary: 'textOnAccent',
  secondary: 'accent',
  ghost: 'accent',
  danger: 'danger',
}

const Button = ({
  label,
  variant = 'primary',
  size = 'regular',
  icon,
  isLoading = false,
  isDisabled = false,
  style,
  accessibilityHint,
  ...props
}: ButtonProps) => {
  const isInactive = isDisabled || isLoading
  const labelColor: ColorName =
    isInactive && variant !== 'ghost' ? 'textSecondary' : LABEL_COLOR[variant]

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: isLoading }}
      disabled={isInactive}
      style={({ pressed }) => [
        styles.base,
        size === 'compact' && styles.compact,
        styles[variant],
        isInactive && variant !== 'ghost' && styles.disabled,
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS[labelColor]} size="small" />
      ) : (
        icon && <Ionicons color={COLORS[labelColor]} name={icon} size={18} />
      )}
      <AppText color={labelColor} variant={size === 'compact' ? 'captionStrong' : 'bodyStrong'}>
        {label}
      </AppText>
    </Pressable>
  )
}

export default memo(Button)
