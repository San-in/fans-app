import { COLORS } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  // Above the list: while the keyboard is open the list slides up underneath it.
  header: {
    backgroundColor: COLORS.background,
    zIndex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
})
