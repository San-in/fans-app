export * from './Colors'
export * from './Typography'

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const MIN_TOUCH_SIZE = 44
