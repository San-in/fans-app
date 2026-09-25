import type { ColorName, TypographyVariant } from '@theme'
import type { TextProps } from 'react-native'

export type AppTextProps = TextProps & {
  variant?: TypographyVariant
  color?: ColorName
  align?: 'left' | 'center' | 'right'
}
