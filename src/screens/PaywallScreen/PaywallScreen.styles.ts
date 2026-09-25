import { COLORS, RADIUS, SPACING } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  actions: {
    gap: SPACING.xs,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
  },
  benefits: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  container: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  content: {
    gap: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  hero: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  planCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    flexDirection: 'row',
    gap: SPACING.md,
    minHeight: 76,
    padding: SPACING.lg,
  },
  planCardActive: {
    borderColor: COLORS.success,
  },
  planLoading: {
    alignItems: 'center',
    flex: 1,
  },
  planText: {
    flex: 1,
    gap: SPACING.xxs,
  },
  statusCard: {
    alignItems: 'flex-start',
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  statusText: {
    flex: 1,
    gap: SPACING.xxs,
  },
  status_accent: {
    backgroundColor: COLORS.accentSoft,
  },
  status_danger: {
    backgroundColor: COLORS.dangerSoft,
  },
  status_neutral: {
    backgroundColor: COLORS.background,
  },
  status_success: {
    backgroundColor: COLORS.successSoft,
  },
  status_warning: {
    backgroundColor: COLORS.warningSoft,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
})
