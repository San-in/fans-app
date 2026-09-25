import { COLORS } from '@theme'
import { memo } from 'react'
import Svg, { Path } from 'react-native-svg'

import type { IconProps } from './icons.types'

// Exported from Figma.
const SendIcon = ({ size = 16, color = COLORS.textOnAccent }: IconProps) => (
  <Svg fill="none" height={size} viewBox="0 0 16 16" width={size}>
    <Path
      d="M6.34018 2.81911L12.0468 5.67245C14.6068 6.95245 14.6068 9.04578 12.0468 10.3258L6.34018 13.1791C2.50018 15.0991 0.933509 13.5258 2.85351 9.69245L3.43351 8.53911C3.58018 8.24578 3.58018 7.75911 3.43351 7.46578L2.85351 6.30578C0.933509 2.47245 2.50684 0.899113 6.34018 2.81911Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
    <Path
      d="M3.62695 8H7.22695"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
  </Svg>
)

export default memo(SendIcon)
