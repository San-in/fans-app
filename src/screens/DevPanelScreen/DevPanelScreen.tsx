import {
  AppText,
  Button,
  IconButton,
  SegmentedControl,
  type SegmentedOption,
} from '@components/atoms'
import { SectionCard } from '@components/molecules'
import { BillingSimulationControls } from '@components/organisms'
import { PRODUCT_IDS } from '@constants'
import {
  useAccessState,
  useChatState,
  useDevSettingsState,
  usePurchasesState,
  useRuntime,
} from '@hooks'
import type { RootStackScreenProps, ROUTES } from '@navigation/RootStack'
import { formatPerfResult, perfStore, requestPerfRun } from '@services/perf/perfStore'
import { COLORS } from '@theme'
import type { SendFault } from '@types'
import { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from 'zustand'

import { styles } from './DevPanelScreen.styles'

const LATENCY_OPTIONS: ReadonlyArray<SegmentedOption<number>> = [
  { value: 50, label: 'Fast' },
  { value: 350, label: 'Normal' },
  { value: 1500, label: 'Slow' },
]

const FAULT_LABELS: Record<SendFault, string> = {
  loseResponse: 'lose response',
  serverError: '503',
  rateLimited: '429',
}

type ToggleRowProps = {
  title: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
}

const ToggleRow = ({ title, description, value, onValueChange }: ToggleRowProps) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleText}>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText color="textSecondary" variant="caption">
        {description}
      </AppText>
    </View>
    <Switch
      accessibilityHint={description}
      accessibilityLabel={title}
      onValueChange={onValueChange}
      trackColor={{ true: COLORS.accent, false: COLORS.border }}
      value={value}
    />
  </View>
)

/** The failure-case controls the task asks for, plus live counters to verify what happened. */
const DevPanelScreen = ({ navigation }: RootStackScreenProps<typeof ROUTES.devPanel>) => {
  const { runtime, resetEverything } = useRuntime()
  const { bottom } = useSafeAreaInsets()
  const isOffline = useDevSettingsState((state) => state.isOffline)
  const latencyMs = useDevSettingsState((state) => state.latencyMs)
  const legacyDuplicateBug = useDevSettingsState((state) => state.legacyDuplicateBug)
  const repeatEvents = useDevSettingsState((state) => state.repeatEvents)
  const sendFaults = useDevSettingsState((state) => state.sendFaults)
  const outboxCount = useChatState((state) => state.outbox.length)
  const loadedCount = useChatState((state) => state.messages.length)
  const accessStatus = useAccessState((state) => state.status)
  const pendingPurchases = usePurchasesState((state) => state.pendingTransactions.length)
  const isBenchmarkRunning = useStore(perfStore, (state) => state.isRunning)
  const [latestResult] = useStore(perfStore, (state) => state.results)
  const [serverSnapshot, setServerSnapshot] = useState(() => runtime.server.getSnapshot())

  // The server isn't a store the UI subscribes to; refresh its counters while open.
  useEffect(() => {
    const intervalId = setInterval(() => setServerSnapshot(runtime.server.getSnapshot()), 500)
    return () => clearInterval(intervalId)
  }, [runtime])

  const updateSettings = runtime.devSettings.update.bind(runtime.devSettings)

  const handleRunBenchmark = useCallback(() => {
    requestPerfRun()
    navigation.goBack()
  }, [navigation])

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset everything?',
      'Clears the app’s outbox and cache, the mock server’s messages and purchases, the mock store ledger and these settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetEverything },
      ]
    )
  }, [resetEverything])

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <AppText accessibilityRole="header" variant="heading">
          Simulation controls
        </AppText>
        <IconButton accessibilityLabel="Close" icon="close" onPress={navigation.goBack} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}>
        <SectionCard title="Network">
          <ToggleRow
            description="Requests fail, the socket disconnects. Survives a force-quit."
            onValueChange={(value) => updateSettings({ isOffline: value })}
            title="Offline"
            value={isOffline}
          />
          <SegmentedControl
            accessibilityLabel="Network latency"
            onChange={(value) => updateSettings({ latencyMs: value })}
            options={LATENCY_OPTIONS}
            value={latencyMs}
          />
        </SectionCard>

        <SectionCard
          description={
            sendFaults.length > 0
              ? `Queued for the next attempts: ${sendFaults.map((fault) => FAULT_LABELS[fault]).join(', ')}`
              : 'Each tap queues a one-shot failure for the next send attempt.'
          }
          title="Next send"
        >
          <View style={styles.buttonGrid}>
            <Button
              label="Lose response"
              onPress={() => runtime.devSettings.enqueueSendFault('loseResponse')}
              size="compact"
              variant="secondary"
            />
            <Button
              label="Server error 503"
              onPress={() => runtime.devSettings.enqueueSendFault('serverError')}
              size="compact"
              variant="secondary"
            />
            <Button
              label="Rate limit 429"
              onPress={() => runtime.devSettings.enqueueSendFault('rateLimited')}
              size="compact"
              variant="secondary"
            />
            {sendFaults.length > 0 && (
              <Button
                label="Clear"
                onPress={() => runtime.devSettings.clearSendFaults()}
                size="compact"
                variant="ghost"
              />
            )}
          </View>
          <AppText color="textSecondary" variant="micro">
            “Lose response”: the server stores the message but the reply never arrives. A message
            containing a link is rejected by the server (needs an edit, not a retry).
          </AppText>
        </SectionCard>

        <SectionCard
          description="Written straight into the server. While you’re offline the socket never delivers them — they come back through catch-up."
          title="Incoming"
        >
          <Button
            icon="chatbubbles-outline"
            label="Ethan sends 4 messages"
            onPress={() => runtime.server.simulateCreatorMessages(4)}
            size="compact"
            variant="secondary"
          />
        </SectionCard>

        <SectionCard title="Bugs & repeats">
          <ToggleRow
            description="Every retry mints a new idempotency key — the original duplicate-message bug."
            onValueChange={(value) => updateSettings({ legacyDuplicateBug: value })}
            title="Legacy retry (duplicate bug)"
            value={legacyDuplicateBug}
          />
          <ToggleRow
            description="Realtime and store events are delivered twice."
            onValueChange={(value) => updateSettings({ repeatEvents: value })}
            title="Repeat every event"
            value={repeatEvents}
          />
        </SectionCard>

        <SectionCard title="Billing">
          <BillingSimulationControls />
          <View style={styles.buttonGrid}>
            <Button
              label="Purchase on another device"
              onPress={() => {
                runtime.appStore.simulatePurchaseOnAnotherDevice(PRODUCT_IDS.allAccessMonthly, 3)
                Alert.alert(
                  'Added to the store account',
                  'The backend doesn’t know about it yet — use Restore purchases on the paywall.'
                )
              }}
              size="compact"
              variant="secondary"
            />
            <Button
              label="Expire All Access"
              onPress={() => runtime.server.simulateExpireAllAccess()}
              size="compact"
              variant="secondary"
            />
          </View>
        </SectionCard>

        <SectionCard
          description="Flings up through the 50,000-message history, types a sentence, flings back. Profile it with Perf Monitor or Instruments while it runs."
          title="Performance"
        >
          <Button
            icon="speedometer-outline"
            isLoading={isBenchmarkRunning}
            label="Run scroll & type benchmark"
            onPress={handleRunBenchmark}
            size="compact"
            variant="secondary"
          />
          {latestResult && (
            <AppText color="textSecondary" selectable variant="micro">
              {formatPerfResult(latestResult)}
            </AppText>
          )}
        </SectionCard>

        <SectionCard title="State">
          <AppText color="textSecondary" selectable variant="caption">
            {[
              `App outbox: ${outboxCount} · loaded messages: ${loadedCount}`,
              `Access (backend-confirmed): ${accessStatus} · pending purchases: ${pendingPurchases}`,
              `Server accepted: ${serverSnapshot.acceptedMessages} · free messages used: ${serverSnapshot.quotaUsed}`,
              `Server pending confirmations: ${serverSnapshot.pendingPurchases}`,
              `Store ledger: ${runtime.appStore.getLedgerSize()} transactions`,
            ].join('\n')}
          </AppText>
        </SectionCard>

        <Button
          icon="trash-outline"
          label="Reset everything"
          onPress={handleReset}
          variant="danger"
        />
      </ScrollView>
    </View>
  )
}

export default DevPanelScreen
