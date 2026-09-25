import { COLORS, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
})
