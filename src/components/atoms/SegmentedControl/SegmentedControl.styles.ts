import { COLORS, MIN_TOUCH_SIZE, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xxs,
    padding: SPACING.xxs,
  },
  option: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE - SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionSelected: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
  },
})
