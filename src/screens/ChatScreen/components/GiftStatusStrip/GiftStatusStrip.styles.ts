import { COLORS, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    minHeight: 44,
    paddingLeft: SPACING.md,
  },
  text: {
    flex: 1,
    paddingVertical: SPACING.sm,
  },
})
