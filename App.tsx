import { ToastHost } from '@components/organisms'
import { RootStack } from '@navigation/RootStack'
import { RuntimeProvider } from '@providers'
import { StatusBar } from 'expo-status-bar'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context'

const App = () => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <KeyboardProvider>
      <RuntimeProvider>
        <RootStack />
      </RuntimeProvider>
      <ToastHost />
      <StatusBar style="dark" />
    </KeyboardProvider>
  </SafeAreaProvider>
)

export default App
