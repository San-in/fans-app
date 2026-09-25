import { COLORS, MAX_FONT_SCALE, TYPOGRAPHY } from '@theme'
import { memo } from 'react'
import { Text } from 'react-native'

import { styles } from './AppText.styles'
import type { AppTextProps } from './AppText.types'

/** The only text primitive in the app: typography, color and a sane Dynamic Type ceiling. */
const AppText = ({
  variant = 'body',
  color = 'textPrimary',
  align = 'left',
  style,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  ...props
}: AppTextProps) => (
  <Text
    maxFontSizeMultiplier={maxFontSizeMultiplier}
    style={[
      TYPOGRAPHY[variant],
      { color: COLORS[color] },
      align === 'center' && styles.alignCenter,
      align === 'right' && styles.alignRight,
      style,
    ]}
    {...props}
  />
)

export default memo(AppText)
