import type { MessageKind } from '@types'
import type { ReactNode } from 'react'

export type MessageBubbleTone = 'default' | 'pending' | 'failed'

export type MessageBubbleProps = {
  text: string
  kind: MessageKind
  isOwn: boolean
  /** Creator bubbles only: avatar on the last bubble of a run, a spacer otherwise. */
  isLastInGroup: boolean
  tone: MessageBubbleTone
  footer: ReactNode
  accessibilityLabel: string
  /** Only live messages animate in; history rendered by scrolling never does. */
  shouldAnimateEntry: boolean
  children?: ReactNode
}
