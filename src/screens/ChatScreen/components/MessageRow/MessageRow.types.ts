import type { ChatListItem } from '@services/chat/buildChatListItems'

export type MessageRowProps = {
  item: ChatListItem
  /** Messages created after this timestamp animate in; older ones render still. */
  liveSince: number
  onEditMessage: (clientId: string) => void
  onOpenPaywall: () => void
}
