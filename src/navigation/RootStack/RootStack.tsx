import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ChatScreen, DevPanelScreen, PaywallScreen } from '@screens'

import { type RootStackParamList, ROUTES } from './RootStack.types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const RootStack = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ChatScreen} name={ROUTES.chat} />
      <Stack.Screen
        component={PaywallScreen}
        name={ROUTES.paywall}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        component={DevPanelScreen}
        name={ROUTES.devPanel}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
)

export default RootStack
