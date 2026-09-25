import { AppText, Avatar } from '@components/atoms'
import { CREATOR } from '@constants'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@theme'
import { memo } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'

import { AVATAR_SIZE, styles } from './MessageBubble.styles'
import type { MessageBubbleProps } from './MessageBubble.types'

const ENTRY_ANIMATION = FadeInDown.duration(220).reduceMotion(ReduceMotion.System)

const MessageBubble = ({
  text,
  kind,
  isOwn,
  isLastInGroup,
  tone,
  footer,
  accessibilityLabel,
  shouldAnimateEntry,
  children,
}: MessageBubbleProps) => (
  <Animated.View
    entering={shouldAnimateEntry ? ENTRY_ANIMATION : undefined}
    style={[styles.row, isOwn && styles.rowOwn]}
  >
    {!isOwn &&
      (isLastInGroup ? (
        <Avatar initials={CREATOR.initials} size={AVATAR_SIZE} />
      ) : (
        <View style={styles.avatarSlot} />
      ))}
    <View style={[styles.column, isOwn && styles.columnOwn]}>
      <View
        accessibilityLabel={accessibilityLabel}
        accessible
        style={[
          styles.bubble,
          isOwn && styles.bubbleOwn,
          tone === 'pending' && styles.bubblePending,
          tone === 'failed' && styles.bubbleFailed,
        ]}
      >
        {kind === 'gift' ? (
          <View style={styles.giftRow}>
            <View style={styles.giftIcon}>
              <Ionicons color={COLORS.accent} name="gift-outline" size={18} />
            </View>
            <AppText variant="bodyStrong">{text}</AppText>
          </View>
        ) : (
          <AppText selectable>{text}</AppText>
        )}
        {footer}
      </View>
      {children}
    </View>
  </Animated.View>
)

export default memo(MessageBubble)
