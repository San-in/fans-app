import { COLORS, MIN_TOUCH_SIZE, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
  },
  compact: {
    borderRadius: RADIUS.sm,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.md,
  },
  danger: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerSoft,
  },
  disabled: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.75,
  },
  primary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  primaryPressed: {
    backgroundColor: COLORS.accentPressed,
  },
  secondary: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accentBorder,
  },
})
