import type { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import type { PressableProps, StyleProp, ViewStyle } from 'react-native'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export type ButtonSize = 'regular' | 'compact'

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ComponentProps<typeof Ionicons>['name']
  isLoading?: boolean
  isDisabled?: boolean
  style?: StyleProp<ViewStyle>
}
