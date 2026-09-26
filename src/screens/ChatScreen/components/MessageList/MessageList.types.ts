export type MessageListHandle = {
  scrollToLatest: () => void
  scrollToOffset: (offset: number) => void
  getScrollOffset: () => number
  /** The row at the top of the screen for this scroll offset, and where it starts. */
  getAnchorAt: (offset: number) => { key: string; offset: number } | null
  /** Scroll offset at which that item starts, from the list's own layout. */
  getItemOffset: (key: string) => number | null
}

export type MessageListProps = {
  onEditMessage: (clientId: string) => void
  onOpenPaywall: () => void
}
