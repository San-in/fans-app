import { COLORS, MIN_TOUCH_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '@theme'
import { useMemo } from 'react'
import { StyleSheet } from 'react-native'

// Memoized: the composer re-renders on every keystroke.
export const useComposerStyles = (bottomInset: number) =>
  useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingBottom: bottomInset + SPACING.sm,
        },
      }),
    [bottomInset]
  )

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    flex: 1,
    maxHeight: 120,
    paddingBottom: SPACING.sm + SPACING.xxs,
    paddingTop: SPACING.sm + SPACING.xxs,
  },
  inputRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inputWrapper: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.md,
  },
  inputWrapperError: {
    borderColor: COLORS.danger,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 20,
  },
  quotaRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
})
