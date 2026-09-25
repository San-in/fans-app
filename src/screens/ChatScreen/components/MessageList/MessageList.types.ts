export type MessageListHandle = {
  scrollToLatest: () => void
  scrollToOffset: (offset: number) => void
  getScrollOffset: () => number
}

export type MessageListProps = {
  onEditMessage: (clientId: string) => void
  onOpenPaywall: () => void
}
