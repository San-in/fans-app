export type ComposerHandle = {
  setText: (text: string, options?: { shouldFocus?: boolean }) => void
}

export type ComposerProps = {
  bottomInset: number
  onSent: () => void
  onGiftPress: () => void
  onOpenPaywall: () => void
}
