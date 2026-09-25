/** Sampled from the FanSuite Figma (fan chat, mobile). Text colors meet WCAG AA on white. */
export const COLORS = {
  background: '#FFFFFF',
  surface: '#F5F6FA',
  surfaceOwn: '#EEF0FF',
  border: '#E6E7EF',
  textPrimary: '#16161D',
  textSecondary: '#5F6374',
  textOnAccent: '#FFFFFF',
  accent: '#5863DE',
  accentPressed: '#4852C9',
  accentSoft: '#EEF0FF',
  accentBorder: '#C9CCF6',
  gift: '#8258DE',
  giftSurface: '#F5F5F5',
  iconMuted: '#6B6F80',
  danger: '#C8323F',
  dangerSoft: '#FDECEE',
  warning: '#8A5A00',
  warningSoft: '#FFF4DB',
  success: '#237A52',
  successSoft: '#E5F5EC',
  disabled: '#B9BCCB',
  scrim: 'rgba(22, 22, 29, 0.45)',
  white: '#FFFFFF',
} as const

export type ColorName = keyof typeof COLORS
