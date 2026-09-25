import { AppText } from '@components/atoms/AppText'
import { Pressable, View } from 'react-native'

import { styles } from './SegmentedControl.styles'
import type { SegmentedControlProps } from './SegmentedControl.types'

const SegmentedControl = <TValue extends string | number>({
  accessibilityLabel,
  options,
  value,
  onChange,
}: SegmentedControlProps<TValue>) => (
  <View
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="radiogroup"
    style={styles.container}
  >
    {options.map((option) => {
      const isSelected = option.value === value
      return (
        <Pressable
          key={String(option.value)}
          accessibilityLabel={option.label}
          accessibilityRole="radio"
          accessibilityState={{ checked: isSelected }}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [
            styles.option,
            isSelected && styles.optionSelected,
            pressed && styles.optionPressed,
          ]}
        >
          <AppText
            align="center"
            color={isSelected ? 'accent' : 'textSecondary'}
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            variant="captionStrong"
          >
            {option.label}
          </AppText>
        </Pressable>
      )
    })}
  </View>
)

export default SegmentedControl
