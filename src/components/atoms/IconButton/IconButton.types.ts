import type { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import type { PressableProps, StyleProp, ViewStyle } from 'react-native'

export type IconButtonVariant = 'plain' | 'soft' | 'primary'

export type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: ComponentProps<typeof Ionicons>['name']
  /** Required: an icon alone says nothing to VoiceOver / TalkBack. */
  accessibilityLabel: string
  variant?: IconButtonVariant
  isDisabled?: boolean
  style?: StyleProp<ViewStyle>
}
