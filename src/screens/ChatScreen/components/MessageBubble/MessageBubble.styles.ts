import { COLORS, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const AVATAR_SIZE = 28

export const styles = StyleSheet.create({
  avatarSlot: {
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  bubble: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + SPACING.xxs,
  },
  bubbleFailed: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.danger,
  },
  bubbleOwn: {
    backgroundColor: COLORS.surfaceOwn,
    borderColor: COLORS.surfaceOwn,
  },
  bubblePending: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.accentBorder,
    borderStyle: 'dashed',
  },
  column: {
    flexShrink: 1,
    gap: SPACING.xs,
    maxWidth: '82%',
  },
  columnOwn: {
    alignItems: 'flex-end',
  },
  giftIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  giftRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
})
