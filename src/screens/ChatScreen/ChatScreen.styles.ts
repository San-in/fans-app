import { COLORS } from '@theme'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
    // While translated up, the container's padding overlaps the header; let taps through.
    pointerEvents: 'box-none',
  },
})
