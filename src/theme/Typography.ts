import type { TextStyle } from 'react-native'

export const TYPOGRAPHY = {
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>

export type TypographyVariant = keyof typeof TYPOGRAPHY

/** Dynamic Type stays on, but bubbles and chrome stop growing past this multiplier. */
export const MAX_FONT_SCALE = 1.6
