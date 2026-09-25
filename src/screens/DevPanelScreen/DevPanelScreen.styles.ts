import { COLORS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  container: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  content: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
  },
  toggleText: {
    flex: 1,
    gap: SPACING.xxs,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: SPACING.lg,
    paddingBottom: SPACING.sm,
    paddingRight: SPACING.sm,
    paddingTop: SPACING.lg,
  },
})
