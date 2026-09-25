import { COLORS, MIN_TOUCH_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '@theme'
import { useMemo } from 'react'
import { StyleSheet } from 'react-native'

/** Figma: 36pt field and buttons, 10pt corners. */
const CONTROL_SIZE = 36
const CONTROL_RADIUS = 10
const INPUT_VERTICAL_PADDING = 8

export const COMPOSER_HIT_SLOP = (MIN_TOUCH_SIZE - CONTROL_SIZE) / 2

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
  attachButton: {
    height: CONTROL_SIZE - 2,
    justifyContent: 'center',
    paddingRight: SPACING.xs,
  },
  button: {
    alignItems: 'center',
    borderRadius: CONTROL_RADIUS,
    borderWidth: 1,
    height: CONTROL_SIZE,
    justifyContent: 'center',
    width: CONTROL_SIZE,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.8,
  },
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
  gift: {
    backgroundColor: COLORS.giftSurface,
    borderColor: COLORS.giftSurface,
    boxShadow: `inset 0px -2px 4px 0px ${COLORS.gift}`,
  },
  // No lineHeight here: on iOS it adds the extra leading above the text, which
  // pushed the placeholder below centre. Equal padding keeps it centred.
  input: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: TYPOGRAPHY.body.fontSize,
    includeFontPadding: false,
    maxHeight: 120,
    paddingBottom: INPUT_VERTICAL_PADDING,
    paddingHorizontal: 0,
    paddingTop: INPUT_VERTICAL_PADDING,
    textAlignVertical: 'center',
  },
  inputRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inputWrapper: {
    alignItems: 'flex-end',
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: CONTROL_RADIUS,
    borderWidth: 1,
    boxShadow: '0px 1px 2px rgba(22, 22, 29, 0.06)',
    flex: 1,
    flexDirection: 'row',
    minHeight: CONTROL_SIZE,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.md,
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
  send: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
})
