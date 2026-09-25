import { COLORS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + SPACING.xxs,
  },
  offline: {
    backgroundColor: COLORS.warningSoft,
    borderBottomColor: COLORS.warningSoft,
  },
  reconnecting: {
    backgroundColor: COLORS.accentSoft,
    borderBottomColor: COLORS.accentSoft,
  },
  text: {
    flex: 1,
  },
})
