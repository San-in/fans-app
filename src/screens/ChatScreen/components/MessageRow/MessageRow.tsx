import { AppText } from '@components/atoms'
import { CREATOR } from '@constants'
import { useChatState } from '@hooks'
import { formatMessageTime } from '@utils'
import { memo } from 'react'
import { View } from 'react-native'

import { MessageBubble } from '../MessageBubble'
import { describeDeliveryStatus, SENT_STATUS } from './describeDeliveryStatus'
import FailedMessageActions from './FailedMessageActions'
import MessageFooter from './MessageFooter'
import { styles } from './MessageRow.styles'
import type { MessageRowProps } from './MessageRow.types'

/**
 * Pending and confirmed own messages share a key and render the same root
 * element, so confirmation updates the bubble in place — no remount, no
 * replayed entry animation, no jump.
 */
const MessageRow = ({ item, liveSince, onEditMessage, onOpenPaywall }: MessageRowProps) => {
  const connection = useChatState((state) => state.connection)

  switch (item.type) {
    case 'day':
      return (
        <View accessibilityRole="header" style={styles.day}>
          <AppText color="textSecondary" style={styles.dayLabel} variant="caption">
            {item.label}
          </AppText>
        </View>
      )

    case 'message': {
      const { message, isOwn, isLastInGroup } = item
      const time = formatMessageTime(message.createdAt)
      const author = isOwn ? 'You' : CREATOR.displayName
      return (
        <MessageBubble
          accessibilityLabel={`${author}, ${time}: ${message.text}${isOwn ? '. Sent' : ''}`}
          footer={<MessageFooter status={isOwn ? SENT_STATUS : null} time={time} />}
          isLastInGroup={isLastInGroup}
          isOwn={isOwn}
          kind={message.kind}
          shouldAnimateEntry={message.createdAt >= liveSince}
          text={message.text}
          tone="default"
        />
      )
    }

    case 'pending': {
      const { item: outboxItem } = item
      const status = describeDeliveryStatus(outboxItem, connection)
      const isFailed = outboxItem.status === 'failed'
      return (
        <MessageBubble
          accessibilityLabel={`You: ${outboxItem.text}. ${status.label}`}
          footer={<MessageFooter status={status} time={formatMessageTime(outboxItem.createdAt)} />}
          isLastInGroup
          isOwn
          kind="text"
          shouldAnimateEntry
          text={outboxItem.text}
          tone={isFailed ? 'failed' : 'pending'}
        >
          {isFailed && (
            <FailedMessageActions
              item={outboxItem}
              onEditMessage={onEditMessage}
              onOpenPaywall={onOpenPaywall}
            />
          )}
        </MessageBubble>
      )
    }
  }
}

export default memo(MessageRow)
