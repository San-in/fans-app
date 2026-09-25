import { AppText } from '@components/atoms'
import { memo, type PropsWithChildren } from 'react'
import { View } from 'react-native'

import { styles } from './SectionCard.styles'

type SectionCardProps = PropsWithChildren<{
  title: string
  description?: string
}>

const SectionCard = ({ title, description, children }: SectionCardProps) => (
  <View style={styles.container}>
    <View style={styles.heading}>
      <AppText accessibilityRole="header" variant="bodyStrong">
        {title}
      </AppText>
      {description && (
        <AppText color="textSecondary" variant="caption">
          {description}
        </AppText>
      )}
    </View>
    {children}
  </View>
)

export default memo(SectionCard)
