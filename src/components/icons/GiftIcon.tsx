import { COLORS } from '@theme'
import { memo } from 'react'
import Svg, { Path } from 'react-native-svg'

import type { IconProps } from './icons.types'

// Exported from Figma; the viewBox crops the 16px glyph out of the 36px button frame.
const GiftIcon = ({ size = 16, color = COLORS.gift }: IconProps) => (
  <Svg fill="none" height={size} viewBox="10 10 16 16" width={size}>
    <Path
      d="M22.9266 18.707V22.927C22.9266 23.7004 22.2932 24.3337 21.5199 24.3337H14.4799C13.7066 24.3337 13.0732 23.7004 13.0732 22.927V18.707H22.9266Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.33}
    />
    <Path
      d="M24.3337 16.3608V17.5342C24.3337 18.1809 23.7003 18.7075 22.927 18.7075H13.0737C12.3003 18.7075 11.667 18.1809 11.667 17.5342V16.3608C11.667 15.7142 12.3003 15.1875 13.0737 15.1875H22.927C23.7003 15.1875 24.3337 15.7142 24.3337 16.3608Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.33}
    />
    <Path
      d="M16.4272 15.1009C17.8338 15.3743 18.1872 15.0343 17.9205 13.6076C17.6072 11.9409 15.9605 11.1009 14.9538 12.0943C13.9338 13.0943 14.7738 14.7809 16.4272 15.1009Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.33}
    />
    <Path
      d="M19.5735 15.1009C18.1668 15.3743 17.8135 15.0343 18.0802 13.6076C18.3935 11.9409 20.0402 11.1009 21.0468 12.0943C22.0668 13.0943 21.2268 14.7809 19.5735 15.1009Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.33}
    />
  </Svg>
)

export default memo(GiftIcon)
