import type { DevSettingsState } from '@mock/devSettings/DevSettingsStore'
import type { AccessState } from '@services/access/AccessService'
import type { PurchasesState } from '@services/billing/PurchaseManager'
import { createChatListSelector } from '@services/chat/buildChatListItems'
import type { ChatState } from '@services/chat/ChatEngine'
import { useState } from 'react'
import { useStore } from 'zustand'

import { useRuntime } from './useRuntime'

// Thin typed bindings over the services' vanilla stores. Selectors must return
// stable references; use `useShallow` from zustand when selecting objects.

export const useChatState = <TSelected>(selector: (state: ChatState) => TSelected) =>
  useStore(useRuntime().runtime.chat.store, selector)

export const useAccessState = <TSelected>(selector: (state: AccessState) => TSelected) =>
  useStore(useRuntime().runtime.access.store, selector)

export const usePurchasesState = <TSelected>(selector: (state: PurchasesState) => TSelected) =>
  useStore(useRuntime().runtime.purchases.store, selector)

export const useDevSettingsState = <TSelected>(selector: (state: DevSettingsState) => TSelected) =>
  useStore(useRuntime().runtime.devSettings.store, selector)

export const useChatListItems = () => {
  const { runtime } = useRuntime()
  // One memoized selector per mount; the tree remounts when the runtime is reset.
  const [selectListItems] = useState(() => createChatListSelector(Date.now))
  return useStore(runtime.chat.store, selectListItems)
}
