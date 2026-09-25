import { AppText, Button } from '@components/atoms'
import { useAccessState, useRuntime } from '@hooks'
import { haptics } from '@services/feedback/haptics'
import type { OutboxItem } from '@types'
import { memo, useCallback } from 'react'
import { Alert, View } from 'react-native'

import { styles } from './MessageRow.styles'

type FailedMessageActionsProps = {
  item: OutboxItem
  onEditMessage: (clientId: string) => void
  onOpenPaywall: () => void
}

const FailedMessageActions = ({
  item,
  onEditMessage,
  onOpenPaywall,
}: FailedMessageActionsProps) => {
  const { runtime } = useRuntime()
  const isAllAccessActive = useAccessState(({ status }) => status === 'active')
  const { clientId, failure } = item

  const handleRetry = useCallback(() => {
    haptics.tap()
    runtime.chat.retryMessage(clientId)
  }, [clientId, runtime])

  const handleDelete = useCallback(() => {
    Alert.alert('Delete this message?', 'It hasn’t been sent, so Ethan will never see it.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => runtime.chat.discardMessage(clientId),
      },
    ])
  }, [clientId, runtime])

  if (!failure) {
    return null
  }

  // Quota failures become plain retries once All Access is confirmed by the backend.
  const canRetry =
    failure.action === 'retry' || (failure.action === 'getAccess' && isAllAccessActive)

  return (
    <View style={styles.failedActions}>
      <AppText color="danger" variant="caption">
        {failure.message}
      </AppText>
      <View style={styles.actionRow}>
        {canRetry && (
          <Button
            accessibilityHint="Sends it again. It will not be delivered twice."
            icon="refresh"
            label="Retry"
            onPress={handleRetry}
            size="compact"
            variant="secondary"
          />
        )}
        {failure.action === 'edit' && (
          <Button
            accessibilityHint="Moves the text back into the message box"
            icon="create-outline"
            label="Edit"
            onPress={() => onEditMessage(clientId)}
            size="compact"
            variant="secondary"
          />
        )}
        {failure.action === 'getAccess' && !isAllAccessActive && (
          <Button
            icon="star"
            label="Get All Access"
            onPress={onOpenPaywall}
            size="compact"
            variant="primary"
          />
        )}
        <Button label="Delete" onPress={handleDelete} size="compact" variant="ghost" />
      </View>
    </View>
  )
}

export default memo(FailedMessageActions)
