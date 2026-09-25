import { IconButton } from '@components/atoms'
import { useChatListItems, useRuntime } from '@hooks'
import type { ChatListItem } from '@services/chat/buildChatListItems'
import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list'
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, View } from 'react-native'
import Animated, { FadeIn, FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated'

import { MessageRow } from '../MessageRow'
import EmptyThread from './EmptyThread'
import { styles } from './MessageList.styles'
import type { MessageListHandle, MessageListProps } from './MessageList.types'
import OlderMessagesHeader from './OlderMessagesHeader'

const AWAY_FROM_END_PX = 360

const keyExtractor = (item: ChatListItem) => item.key

// Pending and confirmed own messages share a type so FlashList recycles them together.
const getItemType = (item: ChatListItem) => {
  if (item.type === 'day') {
    return 'day'
  }
  if (item.type === 'pending' || item.isOwn) {
    return 'own'
  }
  return 'creator'
}

const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  ({ onEditMessage, onOpenPaywall }, ref) => {
    const { runtime } = useRuntime()
    const listRef = useRef<FlashListRef<ChatListItem>>(null)
    const items = useChatListItems()
    const isReducedMotion = useReducedMotion()
    const [liveSince] = useState(Date.now)
    const scrollOffsetRef = useRef(0)
    const [isAwayFromEnd, setIsAwayFromEnd] = useState(false)

    const scrollToLatest = useCallback(() => {
      listRef.current?.scrollToEnd({ animated: !isReducedMotion })
    }, [isReducedMotion])

    useImperativeHandle(
      ref,
      () => ({
        scrollToLatest,
        scrollToOffset: (offset) => listRef.current?.scrollToOffset({ offset, animated: false }),
        getScrollOffset: () => scrollOffsetRef.current,
      }),
      [scrollToLatest]
    )

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
      scrollOffsetRef.current = contentOffset.y
      const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y
      const nextIsAwayFromEnd = distanceFromEnd > AWAY_FROM_END_PX
      // Only flips re-render; plain scrolling never touches React state.
      setIsAwayFromEnd((current) => (current === nextIsAwayFromEnd ? current : nextIsAwayFromEnd))
    }, [])

    const handleStartReached = useCallback(() => {
      void runtime.chat.loadOlderMessages()
    }, [runtime])

    const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<ChatListItem>) => (
        <MessageRow
          item={item}
          liveSince={liveSince}
          onEditMessage={onEditMessage}
          onOpenPaywall={onOpenPaywall}
        />
      ),
      [liveSince, onEditMessage, onOpenPaywall]
    )

    const maintainVisibleContentPosition = useMemo(
      () => ({
        startRenderingFromBottom: true,
        autoscrollToBottomThreshold: 0.2,
        animateAutoScrollToBottom: !isReducedMotion,
      }),
      [isReducedMotion]
    )

    return (
      <View style={styles.container}>
        <FlashList
          ref={listRef}
          ListEmptyComponent={EmptyThread}
          ListHeaderComponent={items.length > 0 ? OlderMessagesHeader : null}
          contentContainerStyle={styles.content}
          data={items}
          getItemType={getItemType}
          keyExtractor={keyExtractor}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={maintainVisibleContentPosition}
          onScroll={handleScroll}
          onStartReached={handleStartReached}
          onStartReachedThreshold={0.5}
          renderItem={renderItem}
          scrollEventThrottle={32}
        />
        {isAwayFromEnd && (
          <Animated.View
            entering={FadeIn.reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.reduceMotion(ReduceMotion.System)}
            style={styles.scrollToLatest}
          >
            <IconButton
              accessibilityLabel="Jump to the latest messages"
              icon="arrow-down"
              onPress={scrollToLatest}
              variant="soft"
            />
          </Animated.View>
        )}
      </View>
    )
  }
)

MessageList.displayName = 'MessageList'

export default memo(MessageList)
