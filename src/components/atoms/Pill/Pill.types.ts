import type { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import type { PressableProps } from 'react-native'

export type PillTone = 'accent' | 'outline' | 'warning' | 'danger' | 'success' | 'neutral'

export type PillProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string
  tone?: PillTone
  icon?: ComponentProps<typeof Ionicons>['name']
  isLoading?: boolean
}
