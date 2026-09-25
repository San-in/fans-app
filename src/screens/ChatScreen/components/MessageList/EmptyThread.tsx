import { AppText } from '@components/atoms'
import { useChatState } from '@hooks'
import { COLORS } from '@theme'
import { memo } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { styles } from './MessageList.styles'

/** Shown only on a first launch with no cached thread. */
const EmptyThread = () => {
  const connection = useChatState((state) => state.connection)
  const isOffline = connection === 'offline'

  return (
    <View style={styles.empty}>
      {!isOffline && <ActivityIndicator color={COLORS.accent} />}
      <AppText align="center" color="textSecondary" variant="caption">
        {isOffline
          ? 'You’re offline. Your chat will load as soon as you reconnect — you can already write messages.'
          : 'Loading your chat…'}
      </AppText>
    </View>
  )
}

export default memo(EmptyThread)
