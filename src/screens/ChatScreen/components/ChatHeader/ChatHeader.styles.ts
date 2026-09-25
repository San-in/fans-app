import { COLORS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  creatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
  },
  creatorText: {
    flex: 1,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
})
