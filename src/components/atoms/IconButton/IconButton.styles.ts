import { COLORS, MIN_TOUCH_SIZE, RADIUS } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    height: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    width: MIN_TOUCH_SIZE,
  },
  disabled: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  plain: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
  primary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  soft: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accentBorder,
  },
})
