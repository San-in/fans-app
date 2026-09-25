import { useRuntime } from '@hooks'
import { haptics } from '@services/feedback/haptics'
import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Haptics and screen-reader announcements for state changes the user didn't
 * trigger directly. Driven by store transitions, not by row mounts, so a
 * recycled list cell never buzzes twice for the same failure.
 */
export const useDeliveryFeedback = () => {
  const { runtime } = useRuntime()

  useEffect(() => {
    const unsubscribeChat = runtime.chat.store.subscribe(({ outbox }, previous) => {
      const previouslyFailed = new Set(
        previous.outbox.filter(({ status }) => status === 'failed').map(({ clientId }) => clientId)
      )
      const newlyFailed = outbox.filter(
        ({ status, clientId }) => status === 'failed' && !previouslyFailed.has(clientId)
      )
      const [firstFailure] = newlyFailed
      if (firstFailure?.failure) {
        haptics.warning()
        AccessibilityInfo.announceForAccessibility(
          `Message not sent. ${firstFailure.failure.message}`
        )
      }
    })

    const unsubscribePurchases = runtime.purchases.store.subscribe(({ lastOutcome }, previous) => {
      if (!lastOutcome || lastOutcome === previous.lastOutcome) {
        return
      }
      if (lastOutcome.type === 'purchased' || lastOutcome.type === 'restored') {
        haptics.success()
      } else if (lastOutcome.type === 'failed' || lastOutcome.type === 'rejected') {
        haptics.error()
      }
    })

    return () => {
      unsubscribeChat()
      unsubscribePurchases()
    }
  }, [runtime])
}
