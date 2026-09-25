import { AppText } from '@components/atoms'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@theme'
import { memo } from 'react'
import { ActivityIndicator, View } from 'react-native'

import type { DeliveryStatus } from './describeDeliveryStatus'
import { styles } from './MessageRow.styles'

type MessageFooterProps = {
  time: string
  status: DeliveryStatus | null
}

const MessageFooter = ({ time, status }: MessageFooterProps) => (
  <View importantForAccessibility="no-hide-descendants" style={styles.footer}>
    <AppText color="textSecondary" variant="micro">
      {time}
    </AppText>
    {status && (
      <View style={styles.status}>
        {status.isBusy && <ActivityIndicator color={COLORS.textSecondary} size="small" />}
        {status.icon && <Ionicons color={COLORS[status.color]} name={status.icon} size={13} />}
        <AppText color={status.color} variant="micro">
          {status.label}
        </AppText>
      </View>
    )}
  </View>
)

export default memo(MessageFooter)
