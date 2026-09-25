import { COLORS, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
  },
  day: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  dayLabel: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
  },
  failedActions: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingTop: SPACING.xxs,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
})
