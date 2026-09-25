import { AppText, Avatar, IconButton } from '@components/atoms'
import { CREATOR } from '@constants'
import { memo } from 'react'
import { View } from 'react-native'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import AccessPill from './AccessPill'
import { styles } from './ChatHeader.styles'

type ChatHeaderProps = {
  onOpenPaywall: () => void
  onOpenDevPanel: () => void
}

const ChatHeader = ({ onOpenPaywall, onOpenDevPanel }: ChatHeaderProps) => {
  const { top: liveTopInset } = useSafeAreaInsets()
  // Portrait-locked, so the launch value is the real one; the live inset can
  // transiently read 0 on Android and would resize the header mid-typing.
  const topInset = initialWindowMetrics?.insets.top ?? liveTopInset

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.titleRow}>
        <AppText accessibilityRole="header" variant="heading">
          Chat with
        </AppText>
        <IconButton
          accessibilityHint="Network, failure and billing simulation"
          accessibilityLabel="Open simulation controls"
          icon="ellipsis-vertical"
          onPress={onOpenDevPanel}
        />
      </View>
      <View style={styles.creatorRow}>
        <Avatar initials={CREATOR.initials} size={40} />
        <View style={styles.creatorText}>
          <AppText numberOfLines={1} variant="bodyStrong">
            {CREATOR.displayName}
          </AppText>
          <AppText color="accent" numberOfLines={1} variant="caption">
            {CREATOR.handle}
          </AppText>
        </View>
        <AccessPill onPress={onOpenPaywall} />
      </View>
    </View>
  )
}

export default memo(ChatHeader)
