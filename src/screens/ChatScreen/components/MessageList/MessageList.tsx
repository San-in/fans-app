import { IconButton } from '@components/atoms'
import { useChatListItems, useRuntime } from '@hooks'
import type { ChatListItem } from '@services/chat/buildChatListItems'
import { haptics } from '@services/feedback/haptics'
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
/** Within this distance the reader counts as "at the latest message". */
const AT_END_PX = 48

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
    const itemsRef = useRef(items)
    itemsRef.current = items
    const isReducedMotion = useReducedMotion()
    const [liveSince] = useState(Date.now)
    const scrollOffsetRef = useRef(0)
    const isAtEndRef = useRef(true)
    const contentHeightRef = useRef(0)
    const [isAwayFromEnd, setIsAwayFromEnd] = useState(false)

    const scrollToLatest = useCallback(() => {
      listRef.current?.scrollToEnd({ animated: !isReducedMotion })
    }, [isReducedMotion])

    const handleJumpToLatest = useCallback(() => {
      haptics.tap()
      scrollToLatest()
    }, [scrollToLatest])

    // New rows are handled by maintainVisibleContentPosition, but a bubble that grows
    // in place (failure text and actions) isn't: keep it in view if the reader was there.
    const handleContentSizeChange = useCallback(
      (_width: number, height: number) => {
        const previousHeight = contentHeightRef.current
        contentHeightRef.current = height
        if (height > previousHeight && isAtEndRef.current) {
          scrollToLatest()
        }
      },
      [scrollToLatest]
    )

    useImperativeHandle(
      ref,
      () => ({
        scrollToLatest,
        scrollToOffset: (offset) => listRef.current?.scrollToOffset({ offset, animated: false }),
        getScrollOffset: () => scrollOffsetRef.current,
        getTopMessageKey: () => itemsRef.current.find(({ type }) => type !== 'day')?.key ?? null,
        getItemOffset: (key) => {
          const index = itemsRef.current.findIndex((item) => item.key === key)
          const layout = index >= 0 ? listRef.current?.getLayout(index) : undefined
          return layout ? (listRef.current?.getFirstItemOffset() ?? 0) + layout.y : null
        },
      }),
      [scrollToLatest]
    )

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
      scrollOffsetRef.current = contentOffset.y
      const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y
      isAtEndRef.current = distanceFromEnd <= AT_END_PX
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
          onContentSizeChange={handleContentSizeChange}
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
              onPress={handleJumpToLatest}
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
