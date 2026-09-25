export type MessageListHandle = {
  scrollToLatest: () => void
  scrollToOffset: (offset: number) => void
  getScrollOffset: () => number
  /** Key of the oldest loaded bubble (day separators skipped). */
  getTopMessageKey: () => string | null
  /** Scroll offset at which that item starts, from the list's own layout. */
  getItemOffset: (key: string) => number | null
}

export type MessageListProps = {
  onEditMessage: (clientId: string) => void
  onOpenPaywall: () => void
}
