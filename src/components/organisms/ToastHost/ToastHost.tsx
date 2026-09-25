import { AppText } from '@components/atoms'
import { Ionicons } from '@expo/vector-icons'
import { dismissToast, toastStore, type ToastTone } from '@services/feedback/toast'
import { type ColorName, COLORS, SPACING } from '@theme'
import { type ComponentProps, memo, type ReactNode, useEffect } from 'react'
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'
import { FullWindowOverlay } from 'react-native-screens'
import { useStore } from 'zustand'

import { styles } from './ToastHost.styles'

const ENTERING = FadeInUp.duration(200).reduceMotion(ReduceMotion.System)
const EXITING = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System)

const TONES: Record<
  ToastTone,
  { icon: ComponentProps<typeof Ionicons>['name']; color: ColorName }
> = {
  neutral: { icon: 'information-circle', color: 'accent' },
  success: { icon: 'checkmark-circle', color: 'success' },
  warning: { icon: 'alert-circle', color: 'warning' },
  danger: { icon: 'close-circle', color: 'danger' },
}

// iOS presents modals in their own view controllers above the root view, so
// only a full-window overlay can draw over them. Android keeps one window.
const Overlay = ({ children }: { children: ReactNode }) =>
  Platform.OS === 'ios' ? <FullWindowOverlay>{children}</FullWindowOverlay> : children

/** Feedback for actions whose effect isn't on screen yet, e.g. simulation controls. */
const ToastHost = () => {
  const toast = useStore(toastStore, (state) => state.current)
  const { top: liveTopInset } = useSafeAreaInsets()
  const topInset = initialWindowMetrics?.insets.top ?? liveTopInset

  useEffect(() => {
    if (!toast) {
      return undefined
    }
    AccessibilityInfo.announceForAccessibility(toast.message)
    if (toast.durationMs === null) {
      return undefined
    }
    const timeoutId = setTimeout(() => dismissToast(toast.id), toast.durationMs)
    return () => clearTimeout(timeoutId)
  }, [toast])

  const tone = toast ? TONES[toast.tone] : null

  return (
    <Overlay>
      <View style={[styles.container, { paddingTop: topInset + SPACING.sm }]}>
        {toast && tone && (
          <Animated.View key={toast.id} entering={ENTERING} exiting={EXITING} style={styles.toast}>
            <Pressable
              accessibilityHint="Dismisses this message"
              accessibilityRole="button"
              onPress={() => dismissToast(toast.id)}
              style={styles.pressable}
            >
              <Ionicons color={COLORS[tone.color]} name={tone.icon} size={18} />
              <AppText style={styles.text} variant="caption">
                {toast.message}
              </AppText>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Overlay>
  )
}

export default memo(ToastHost)
