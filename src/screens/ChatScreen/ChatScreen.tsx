import { PRODUCT_IDS } from '@constants'
import { useRuntime } from '@hooks'
import { type RootStackScreenProps, ROUTES } from '@navigation/RootStack'
import { useCallback, useRef } from 'react'
import { Alert, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import { styles } from './ChatScreen.styles'
import {
  ChatHeader,
  Composer,
  type ComposerHandle,
  ConnectionBanner,
  GiftStatusStrip,
  MessageList,
  type MessageListHandle,
} from './components'
import { useDeliveryFeedback } from './hooks/useDeliveryFeedback'
import { usePerfBenchmark } from './hooks/usePerfBenchmark'

const ChatScreen = ({ navigation }: RootStackScreenProps<typeof ROUTES.chat>) => {
  const { runtime } = useRuntime()
  const listRef = useRef<MessageListHandle>(null)
  const composerRef = useRef<ComposerHandle>(null)
  const { bottom: liveBottomInset } = useSafeAreaInsets()
  const bottomInset = initialWindowMetrics?.insets.bottom ?? liveBottomInset

  useDeliveryFeedback()
  usePerfBenchmark({ listRef, composerRef })

  const openPaywall = useCallback(() => navigation.navigate(ROUTES.paywall), [navigation])
  const openDevPanel = useCallback(() => navigation.navigate(ROUTES.devPanel), [navigation])
  const handleSent = useCallback(() => listRef.current?.scrollToLatest(), [])

  const handleEditMessage = useCallback(
    (clientId: string) => {
      const text = runtime.chat.takeMessageForEditing(clientId)
      if (text !== null) {
        composerRef.current?.setText(text, { shouldFocus: true })
      }
    },
    [runtime]
  )

  const handleGiftPress = useCallback(() => {
    const gift = runtime.purchases.getState().products.find(({ id }) => id === PRODUCT_IDS.gift)
    Alert.alert(
      `Send Ethan a ${gift?.displayPrice ?? ''} gift?`,
      'Simulated billing — no real charge. The gift appears in the chat once FanSuite confirms the payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send gift', onPress: () => void runtime.purchases.purchase(PRODUCT_IDS.gift) },
      ]
    )
  }, [runtime])

  return (
    <View style={styles.container}>
      <ChatHeader onOpenDevPanel={openDevPanel} onOpenPaywall={openPaywall} />
      <ConnectionBanner />
      {/* List and composer rise together; the negative offset lets the keyboard
          cover the composer's safe-area padding instead of leaving a gap. */}
      <KeyboardAvoidingView
        behavior="translate-with-padding"
        keyboardVerticalOffset={-bottomInset}
        style={styles.keyboardArea}
      >
        <MessageList ref={listRef} onEditMessage={handleEditMessage} onOpenPaywall={openPaywall} />
        <GiftStatusStrip />
        <Composer
          ref={composerRef}
          bottomInset={bottomInset}
          onGiftPress={handleGiftPress}
          onOpenPaywall={openPaywall}
          onSent={handleSent}
        />
      </KeyboardAvoidingView>
    </View>
  )
}

export default ChatScreen
