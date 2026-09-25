import { memo, type ReactNode } from 'react'
import { Pressable } from 'react-native'

import { COMPOSER_HIT_SLOP, styles } from './Composer.styles'

type ComposerButtonProps = {
  variant: 'gift' | 'send'
  accessibilityLabel: string
  accessibilityHint?: string
  isDisabled?: boolean
  onPress: () => void
  children: ReactNode
}

/** The design's 36pt square buttons; hit slop keeps the 44pt touch target. */
const ComposerButton = ({
  variant,
  isDisabled = false,
  children,
  ...props
}: ComposerButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: isDisabled }}
    disabled={isDisabled}
    hitSlop={COMPOSER_HIT_SLOP}
    style={({ pressed }) => [
      styles.button,
      styles[variant],
      isDisabled && styles.buttonDisabled,
      pressed && styles.buttonPressed,
    ]}
    {...props}
  >
    {children}
  </Pressable>
)

export default memo(ComposerButton)
