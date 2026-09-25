import { useRuntime } from '@hooks'
import { haptics } from '@services/feedback/haptics'
import { showToast } from '@services/feedback/toast'
import { useEffect } from 'react'

/**
 * Tells the fan when paid access changes, wherever they are: a delayed backend
 * confirmation can land after the paywall was closed. Success haptics already
 * come from the purchase outcome (`useDeliveryFeedback`).
 */
export const useAccessFeedback = () => {
  const { runtime } = useRuntime()

  useEffect(
    () =>
      runtime.access.store.subscribe(({ status }, previous) => {
        // `unknown` is the launch state: restoring the cached answer isn't news.
        if (previous.status === 'unknown' || status === previous.status) {
          return
        }
        if (status === 'active') {
          showToast('All Access is active — unlimited messages.', { tone: 'success' })
        } else if (status === 'expired' && previous.status === 'active') {
          haptics.warning()
          showToast('All Access has ended. You’re back to free messages.', { tone: 'warning' })
        }
      }),
    [runtime]
  )
}
