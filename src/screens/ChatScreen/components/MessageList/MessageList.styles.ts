import { COLORS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    paddingBottom: SPACING.sm,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  scrollToLatest: {
    bottom: SPACING.md,
    position: 'absolute',
    right: SPACING.lg,
  },
})
