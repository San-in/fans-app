import { createRuntime, type Runtime } from '@services/runtime/createRuntime'
import { createSqliteStorage } from '@services/storage/sqliteStorage'
import { randomUUID } from 'expo-crypto'
import {
  createContext,
  Fragment,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AppState } from 'react-native'

type RuntimeContextValue = {
  runtime: Runtime
  /** Wipes the app, the mock server, the mock store and dev settings, then boots fresh. */
  resetEverything: () => void
}

export const RuntimeContext = createContext<RuntimeContextValue | null>(null)

const createAppRuntime = () =>
  createRuntime({ openStorage: createSqliteStorage, createId: randomUUID })

export const RuntimeProvider = ({ children }: PropsWithChildren) => {
  const [runtime, setRuntime] = useState(createAppRuntime)

  useEffect(() => {
    runtime.start()
    return () => runtime.stop()
  }, [runtime])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        runtime.chat.flushPendingWrites()
      }
    })
    return () => subscription.remove()
  }, [runtime])

  const resetEverything = useCallback(() => {
    runtime.stop()
    runtime.wipeAllData()
    setRuntime(createAppRuntime())
  }, [runtime])

  const value = useMemo(() => ({ runtime, resetEverything }), [runtime, resetEverything])

  // Keyed by runtime: a reset remounts every screen instead of patching stale state.
  return (
    <RuntimeContext.Provider value={value}>
      <Fragment key={runtime.id}>{children}</Fragment>
    </RuntimeContext.Provider>
  )
}
