import { COLORS, MIN_TOUCH_SIZE, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: SPACING.lg,
    // Only the toast itself takes touches; the screen underneath stays usable.
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pressable: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  text: {
    flexShrink: 1,
  },
  toast: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    boxShadow: '0px 6px 20px rgba(22, 22, 29, 0.14)',
    maxWidth: 480,
  },
})
