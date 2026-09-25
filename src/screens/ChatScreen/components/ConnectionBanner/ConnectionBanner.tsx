import { AppText } from '@components/atoms'
import { Ionicons } from '@expo/vector-icons'
import { useChatState } from '@hooks'
import { COLORS } from '@theme'
import { memo, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, View } from 'react-native'
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated'

import { styles } from './ConnectionBanner.styles'

const ENTERING = FadeInUp.duration(200).reduceMotion(ReduceMotion.System)
const EXITING = FadeOutUp.duration(200).reduceMotion(ReduceMotion.System)
const LAYOUT = LinearTransition.duration(200).reduceMotion(ReduceMotion.System)

const describeWaiting = (count: number) =>
  count === 1 ? '1 message is waiting' : `${count} messages are waiting`

/**
 * Offline is always shown. Reconnecting / catching up is shown only after the
 * app has actually been offline, so a normal launch doesn't flash a banner.
 */
const ConnectionBanner = () => {
  const connection = useChatState((state) => state.connection)
  const waitingCount = useChatState(
    ({ outbox }) => outbox.filter(({ status }) => status === 'queued').length
  )
  const [hasBeenOffline, setHasBeenOffline] = useState(false)
  const hasBeenOfflineRef = useRef(false)

  useEffect(() => {
    if (connection === 'offline' && !hasBeenOfflineRef.current) {
      hasBeenOfflineRef.current = true
      setHasBeenOffline(true)
      AccessibilityInfo.announceForAccessibility(
        'You’re offline. Messages will be sent when you reconnect.'
      )
    } else if (connection === 'online' && hasBeenOfflineRef.current) {
      hasBeenOfflineRef.current = false
      setHasBeenOffline(false)
      AccessibilityInfo.announceForAccessibility('Back online.')
    }
  }, [connection])

  const isVisible = connection === 'offline' || (hasBeenOffline && connection !== 'online')
  if (!isVisible) {
    return null
  }

  const isOffline = connection === 'offline'
  const title = isOffline ? 'You’re offline' : 'Reconnecting…'
  let body = 'Catching up on messages you missed.'
  if (isOffline) {
    body =
      waitingCount > 0
        ? `${describeWaiting(waitingCount)} and will send when you reconnect.`
        : 'You can keep writing — messages will send when you reconnect.'
  }

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={ENTERING}
      exiting={EXITING}
      layout={LAYOUT}
      style={[styles.container, isOffline ? styles.offline : styles.reconnecting]}
    >
      {isOffline ? (
        <Ionicons color={COLORS.warning} name="cloud-offline-outline" size={18} />
      ) : (
        <ActivityIndicator color={COLORS.accent} size="small" />
      )}
      <View style={styles.text}>
        <AppText color={isOffline ? 'warning' : 'accent'} variant="captionStrong">
          {title}
        </AppText>
        <AppText color="textSecondary" variant="caption">
          {body}
        </AppText>
      </View>
    </Animated.View>
  )
}

export default memo(ConnectionBanner)
