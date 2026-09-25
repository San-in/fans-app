import { AppText, IconButton } from '@components/atoms'
import { CREATOR, MESSAGE_MAX_LENGTH } from '@constants'
import { usePurchasesState, useRuntime } from '@hooks'
import { haptics } from '@services/feedback/haptics'
import { COLORS, MAX_FONT_SCALE } from '@theme'
import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Alert, TextInput, View } from 'react-native'

import { styles, useComposerStyles } from './Composer.styles'
import type { ComposerHandle, ComposerProps } from './Composer.types'
import QuotaLabel from './QuotaLabel'

/**
 * Owns the draft text locally so typing re-renders only this component —
 * never the message list.
 */
const Composer = forwardRef<ComposerHandle, ComposerProps>(
  ({ bottomInset, onSent, onGiftPress, onOpenPaywall }, ref) => {
    const { runtime } = useRuntime()
    const inputRef = useRef<TextInput>(null)
    const [text, setText] = useState('')
    const isPurchaseBusy = usePurchasesState(({ flow }) => flow.status !== 'idle')
    const dynamicStyles = useComposerStyles(bottomInset)

    useImperativeHandle(
      ref,
      () => ({
        setText: (nextText, { shouldFocus = false } = {}) => {
          setText(nextText)
          if (shouldFocus) {
            inputRef.current?.focus()
          }
        },
      }),
      []
    )

    const isOverLimit = text.length > MESSAGE_MAX_LENGTH
    const canSend = text.trim().length > 0 && !isOverLimit

    const handleSend = useCallback(() => {
      if (!canSend) {
        return
      }
      const result = runtime.chat.sendMessage(text)
      if (result.isAccepted) {
        haptics.tap()
        setText('')
        onSent()
        return
      }
      if (result.reason === 'storageFailed') {
        haptics.error()
        Alert.alert(
          'Couldn’t save your message',
          'The message could not be stored on this device, so it was not queued. Your text is still in the box.'
        )
      }
    }, [canSend, onSent, runtime, text])

    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={styles.inputRow}>
          <View style={[styles.inputWrapper, isOverLimit && styles.inputWrapperError]}>
            <TextInput
              ref={inputRef}
              accessibilityHint="Messages are saved on this device until they are delivered"
              accessibilityLabel={`Message ${CREATOR.displayName}`}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              multiline
              onChangeText={setText}
              placeholder={`Message ${CREATOR.displayName}…`}
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              value={text}
            />
          </View>
          <IconButton
            accessibilityHint="Opens a simulated gift purchase"
            accessibilityLabel="Send a gift"
            icon="gift-outline"
            isDisabled={isPurchaseBusy}
            onPress={onGiftPress}
            variant="soft"
          />
          <IconButton
            accessibilityLabel="Send message"
            icon="send"
            isDisabled={!canSend}
            onPress={handleSend}
            variant="primary"
          />
        </View>
        <View style={styles.metaRow}>
          <AppText
            accessibilityLabel={`${text.length} of ${MESSAGE_MAX_LENGTH} characters`}
            color={isOverLimit ? 'danger' : 'textSecondary'}
            variant="micro"
          >
            {isOverLimit
              ? `${text.length}/${MESSAGE_MAX_LENGTH} · too long`
              : `${text.length}/${MESSAGE_MAX_LENGTH}`}
          </AppText>
          <QuotaLabel onOpenPaywall={onOpenPaywall} />
        </View>
      </View>
    )
  }
)

Composer.displayName = 'Composer'

export default memo(Composer)
