import { COLORS, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  accent: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accentBorder,
  },
  base: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    minHeight: 32,
    paddingHorizontal: SPACING.md,
  },
  danger: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerSoft,
  },
  neutral: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  outline: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  success: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.successSoft,
  },
  warning: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningSoft,
  },
})
