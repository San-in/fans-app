import { AppText, Button } from '@components/atoms'
import { CREATOR } from '@constants'
import { useChatState, useRuntime } from '@hooks'
import { COLORS } from '@theme'
import { memo } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { styles } from './MessageList.styles'

const OlderMessagesHeader = () => {
  const { runtime } = useRuntime()
  const { hasOlder, olderStatus } = useChatState(
    useShallow(({ hasOlder, olderStatus }) => ({ hasOlder, olderStatus }))
  )

  if (olderStatus === 'error') {
    return (
      <View style={styles.header}>
        <AppText align="center" color="textSecondary" variant="caption">
          Couldn’t load earlier messages.
        </AppText>
        <Button
          icon="refresh"
          label="Try again"
          onPress={() => void runtime.chat.loadOlderMessages()}
          size="compact"
          variant="secondary"
        />
      </View>
    )
  }
  if (!hasOlder) {
    return (
      <View style={styles.header}>
        <AppText align="center" color="textSecondary" variant="caption">
          This is the beginning of your chat with {CREATOR.displayName}.
        </AppText>
      </View>
    )
  }
  return (
    <View
      accessibilityLabel={olderStatus === 'loading' ? 'Loading earlier messages' : undefined}
      style={styles.header}
    >
      {olderStatus === 'loading' && <ActivityIndicator color={COLORS.textSecondary} />}
    </View>
  )
}

export default memo(OlderMessagesHeader)
