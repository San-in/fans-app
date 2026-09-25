import type { ServerApi } from '@services/api/createServerApi'
import type { RealtimeClient } from '@services/realtime/RealtimeClient'
import type { KeyValueStorage } from '@services/storage'
import { readJson, writeJson } from '@services/storage'
import type { AccessDto, AccessStatus, EntitlementDto, QuotaDto } from '@types'
import { createStore, type StoreApi } from 'zustand/vanilla'

const ACCESS_CACHE_KEY = 'access.cache.v1'

export type AccessState = {
  status: AccessStatus
  entitlement: EntitlementDto | null
  quota: QuotaDto | null
  /** 'cache' = last backend answer from a previous session, shown until the backend replies. */
  source: 'none' | 'cache' | 'backend'
}

type AccessServiceDependencies = {
  api: ServerApi
  realtime: RealtimeClient
  storage: KeyValueStorage
  now: () => number
}

const toStatus = (entitlement: EntitlementDto | null, now: number): AccessStatus => {
  if (!entitlement) {
    return 'free'
  }
  return entitlement.status === 'active' && entitlement.expiresAt > now ? 'active' : 'expired'
}

/**
 * Paid access as the backend sees it. Nothing on the device — a store
 * purchase result included — can grant access; only `apply()` with a backend
 * answer changes it.
 */
export class AccessService {
  public readonly store: StoreApi<AccessState>
  private unsubscribers: Array<() => void> = []

  constructor(private readonly deps: AccessServiceDependencies) {
    this.store = createStore<AccessState>(() => ({
      status: 'unknown',
      entitlement: null,
      quota: null,
      source: 'none',
    }))
  }

  public start(): void {
    if (this.unsubscribers.length > 0) {
      return
    }
    const cached = readJson<AccessDto | null>(this.deps.storage, ACCESS_CACHE_KEY, null)
    if (cached && this.store.getState().source === 'none') {
      this.store.setState({
        status: toStatus(cached.allAccess, this.deps.now()),
        entitlement: cached.allAccess,
        quota: cached.quota,
        source: 'cache',
      })
    }

    this.unsubscribers = [
      this.deps.realtime.onStatusChange((status) => {
        if (status === 'connected') {
          void this.refresh()
        }
      }),
      this.deps.realtime.onEvent((event) => {
        if (event.type === 'access.updated') {
          void this.refresh()
        }
      }),
    ]
    void this.refresh()
  }

  public stop(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []
  }

  public async refresh(): Promise<void> {
    try {
      this.apply(await this.deps.api.getAccess())
    } catch {
      // Offline or timed out: keep the last known answer; reconnect triggers another refresh.
    }
  }

  public apply(access: AccessDto): void {
    writeJson(this.deps.storage, ACCESS_CACHE_KEY, access)
    this.store.setState({
      status: toStatus(access.allAccess, this.deps.now()),
      entitlement: access.allAccess,
      quota: access.quota,
      source: 'backend',
    })
  }

  public applyQuota(quota: QuotaDto): void {
    const { entitlement } = this.store.getState()
    writeJson(this.deps.storage, ACCESS_CACHE_KEY, { allAccess: entitlement, quota })
    this.store.setState({ quota })
  }

  public isAllAccessActive(): boolean {
    const { entitlement } = this.store.getState()
    return toStatus(entitlement, this.deps.now()) === 'active'
  }
}
