import * as Haptics from 'expo-haptics'

// Fire-and-forget: a haptic must never delay or fail the action it decorates.
export const haptics = {
  tap: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  },
  success: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  },
  warning: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
  },
  error: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
  },
}
