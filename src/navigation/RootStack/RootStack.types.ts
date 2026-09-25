import type { NativeStackScreenProps } from '@react-navigation/native-stack'

export const ROUTES = {
  chat: 'Chat',
  paywall: 'Paywall',
  devPanel: 'DevPanel',
} as const

export type RootStackParamList = {
  [ROUTES.chat]: undefined
  [ROUTES.paywall]: undefined
  [ROUTES.devPanel]: undefined
}

export type RootStackScreenProps<TRoute extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  TRoute
>

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
