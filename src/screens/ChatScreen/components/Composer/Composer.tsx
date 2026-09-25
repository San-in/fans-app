import { AppText } from '@components/atoms'
import { GiftIcon, SendIcon } from '@components/icons'
import { CREATOR, MESSAGE_MAX_LENGTH } from '@constants'
import { Ionicons } from '@expo/vector-icons'
import { usePurchasesState, useRuntime } from '@hooks'
import { haptics } from '@services/feedback/haptics'
import { showToast } from '@services/feedback/toast'
import { COLORS, MAX_FONT_SCALE } from '@theme'
import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Alert, Pressable, TextInput, View } from 'react-native'

import { COMPOSER_HIT_SLOP, styles, useComposerStyles } from './Composer.styles'
import type { ComposerHandle, ComposerProps } from './Composer.types'
import ComposerButton from './ComposerButton'
import QuotaLabel from './QuotaLabel'

/**
 * iOS can commit a pending autocorrection as the send button is tapped. That
 * edit reaches JS after we cleared the field, carrying a newer native event
 * count, so the native side drops our clear and the corrected word reappears.
 * Ignoring edits right after a send lets the controlled input re-apply ''.
 */
const LATE_EDIT_WINDOW_MS = 300

/**
 * Owns the draft text locally so typing re-renders only this component —
 * never the message list.
 */
const Composer = forwardRef<ComposerHandle, ComposerProps>(
  ({ bottomInset, onSent, onGiftPress, onOpenPaywall }, ref) => {
    const { runtime } = useRuntime()
    const inputRef = useRef<TextInput>(null)
    const lastSentAtRef = useRef(0)
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

    const handleChangeText = useCallback((nextText: string) => {
      if (Date.now() - lastSentAtRef.current < LATE_EDIT_WINDOW_MS) {
        return
      }
      setText(nextText)
    }, [])

    const handleSend = useCallback(() => {
      if (!canSend) {
        return
      }
      const result = runtime.chat.sendMessage(text)
      if (result.isAccepted) {
        haptics.tap()
        lastSentAtRef.current = Date.now()
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

    const handleGiftPress = useCallback(() => {
      haptics.tap()
      onGiftPress()
    }, [onGiftPress])

    const handleAttachPress = useCallback(() => {
      haptics.tap()
      showToast('Attachments aren’t part of this demo — only text and gifts.')
    }, [])

    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={styles.inputRow}>
          <View style={[styles.inputWrapper, isOverLimit && styles.inputWrapperError]}>
            <Pressable
              accessibilityHint="Attachments aren’t available in this demo"
              accessibilityLabel="Add attachment"
              accessibilityRole="button"
              hitSlop={COMPOSER_HIT_SLOP}
              onPress={handleAttachPress}
              style={styles.attachButton}
            >
              <Ionicons color={COLORS.iconMuted} name="add-circle" size={20} />
            </Pressable>
            <TextInput
              ref={inputRef}
              accessibilityHint="Messages are saved on this device until they are delivered"
              accessibilityLabel={`Message ${CREATOR.displayName}`}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              multiline
              onChangeText={handleChangeText}
              placeholder={`Message ${CREATOR.displayName}…`}
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              value={text}
            />
          </View>
          <ComposerButton
            accessibilityHint="Opens a simulated gift purchase"
            accessibilityLabel="Send a gift"
            isDisabled={isPurchaseBusy}
            onPress={handleGiftPress}
            variant="gift"
          >
            <GiftIcon />
          </ComposerButton>
          <ComposerButton
            accessibilityLabel="Send message"
            isDisabled={!canSend}
            onPress={handleSend}
            variant="send"
          >
            <SendIcon />
          </ComposerButton>
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
