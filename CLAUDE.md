@AGENTS.md

# CLAUDE.md

Guidance for working in this repository. Where this file and `AGENTS.md` disagree
(navigation), this file wins.

## What this is

A test task for Fans Holdings: a fan ↔ creator chat screen (Expo SDK 54, React Native
0.81, New Architecture, TypeScript) with a subscription paywall. There is **no real
backend** — a mock server, a mock app store and a simulated network run in-process and
persist to their own SQLite files, so every failure case (offline, lost responses,
restarts, delayed purchase confirmation) can be reproduced on a device.

## Mandatory Planning Before Mutating Actions

Read-only actions (Read, Glob, LS, grep, find, `git status`/`log`/`diff`) — execute
immediately.

Mutating actions require a plan and explicit approval: Edit / Write, `rm`, `mv`, package
installs (`npx expo install`, `npm install`), `git commit`, `git push`, `git reset`.

```
Plan:
1. Edit src/services/chat/ChatEngine.ts — …
2. Add src/services/chat/__tests__/… — …

Approve: all / 1 / 2 / 1,2
```

If the user already described the task in detail and said "do it", list the plan and
proceed.

## Commands

```bash
npm start                   # Metro (use --port 8083 if another project holds 8081)
npm run ios                 # Expo Go 54 on the iOS simulator (every module used ships in Expo Go)
npm run ios:dev-build       # native debug build (expo run:ios)
npm run ios:release         # Release build — use this for any performance numbers
npm run android:dev-build   # native debug build for Android
npm test                    # focused tests (jest-expo, in-memory storage)
npm run test:duplicate-bug  # same duplicate test against the legacy retry path — must FAIL
npm run typecheck           # tsc --noEmit
npm run lint                # expo lint (ESLint flat config + Prettier)
npm run check               # typecheck + lint + tests
```

## Architecture

### Two worlds, one graph

`src/services/runtime/createRuntime.ts` builds the whole object graph. The app
(`RuntimeProvider`) and the tests (`src/testing/createTestRuntime.ts`) build **the same
graph**; tests only swap SQLite for `createMemoryDisk()` and shrink the timings.

```
src/mock/        the simulated world — the app never imports it except through ServerApi
  devSettings/   the knobs (offline, latency, faults, store outcome, backend mode). Persisted.
  network/       NetworkSimulator: offline, latency, one-shot faults, lost responses
  server/        MockServer = ServerChat (history, seq, idempotency, quota)
                              + ServerBilling (receipt validation, entitlements)
                              + RealtimeHub (socket fan-out)
  appStore/      MockAppStore: StoreKit / Play Billing stand-in, ledger, unfinished txns

src/services/    the app
  api/           ServerApi — every backend call goes through the network + a client timeout
  realtime/      RealtimeClient — socket; hears events only while connected
  access/        AccessService — paid access, only ever set from a backend answer
  chat/          ChatEngine — outbox, confirmed window, catch-up, pagination
  billing/       PurchaseManager — paywall flows, pending transactions
  perf/          frame sampler + benchmark result store
```

Each service exposes a zustand **vanilla** store (`service.store`); React reads it with
the typed hooks in `src/hooks/useRuntimeState.ts`. Business logic never lives in
components.

### Persistence map

| SQLite file | Owner | Keys |
|---|---|---|
| `fanschat-client.db` | app | `outbox.v1`, `outbox.localOrder.v1`, `thread.cache.v1`, `access.cache.v1`, `billing.pendingTransactions.v1` |
| `mock-server.db` | mock server | `chat.v1` (accepted messages, nextSeq, quota), `billing.v1` (transactions, entitlement) |
| `mock-app-store.db` | mock store | `ledger.v1` |
| `dev-settings.db` | simulation | `settings.v1` |

`KeyValueStorage` is synchronous on purpose (expo-sqlite kv-store): when `setString`
returns, the write is committed. The 50,000-message history is **generated** from
`seq` + a fixed seed (`historyGenerator.ts`) and never stored.

### Delivery guarantees (do not break these)

1. `sendMessage` writes the outbox record — with a clientId minted once — **before** the
   message is shown as queued (`commitOutbox`: persist, then publish).
2. Every attempt, retry and post-restart resend carries the **same clientId**. The server
   dedupes on `(authorId, clientId)` *before* the quota check and returns the original.
3. Every confirmation path (send response, realtime echo, catch-up page) goes through
   `ChatEngine.applyServerMessages`, which removes the outbox entry and inserts the
   message by id in one state update. Repeats are no-ops.
4. The outbox drains **serially in local order**; a message waiting out a backoff blocks
   the ones behind it. Failed messages step out of the line.
5. Order comes from the server `seq` only. Pending messages always render after confirmed
   ones. Own messages are keyed `c:<clientId>` pending *and* confirmed, so confirmation
   updates the cell in place.
6. After every (re)connect the engine catches up by cursor (`getMessagesAfter`) before
   draining the outbox — the socket never delivers what was published while offline.
   A message landing past a hole in `seq` triggers a catch-up too.

### Billing guarantees

- A store success is only a claim. It is persisted to the pending list first, then sent
  to the backend; access changes only in `AccessService.apply()` with a backend answer.
- Every report of a transaction (purchase result, store update event, unfinished at
  launch) goes through `PurchaseManager.handleTransaction` keyed by transactionId; the
  backend applies each transaction's effect exactly once (`ServerBilling.confirm`).
- A failed or cancelled purchase touches only the flow state, never access.
- `isFlowLocked` is a synchronous guard against double taps — do not replace it with
  React state.

## Conventions

- **Structure** follows build-tower: `components/{atoms,molecules,organisms}`, screens with
  local `components/` and `hooks/`, every component as `Name/Name.tsx` + `Name.styles.ts`
  (+ `Name.types.ts`) + `index.ts` barrel.
- **Path aliases** come from `tsconfig.json` `paths` (Metro and jest-expo read them):
  `@components/*`, `@constants`, `@hooks`, `@mock/*`, `@navigation/*`, `@providers`,
  `@screens`, `@services/*`, `@testing/*`, `@theme`, `@types`, `@utils`.
  `@services/storage` must stay free of native imports (tests load it); import
  `sqliteStorage` by its path.
- **Navigation** is React Navigation native-stack (`src/navigation/RootStack`), not Expo
  Router — three screens: Chat, Paywall (modal), DevPanel (modal).
- **Text** only through `AppText` (typography + Dynamic Type ceiling). Tappable icons use
  `IconButton` (a11y label required); everything pressable is `Pressable`, ≥ 44pt.
- **Styles** live in `.styles.ts` (`react-native/no-inline-styles` is an error). Dynamic
  styles go through a memoized `useXxxStyles` hook.
- **Safe area**: size things with `initialWindowMetrics?.insets.* ?? liveInset` — the live
  inset can transiently read 0 on Android (portrait-locked app).
- **Motion**: Reanimated layout animations always `.reduceMotion(ReduceMotion.System)`;
  imperative scrolls use `useReducedMotion()`. Only live messages animate in.
- **Haptics** via `@services/feedback/haptics`, fire-and-forget. Feedback for state the
  user didn't trigger (failures, confirmations) is driven by store transitions
  (`useDeliveryFeedback`), never by row mounts — list cells are recycled.
- **Code style**: no abbreviations in names; `Boolean(x)` not `!!x`; `String()` /
  `Number()` for conversions; destructure; `Array<T>` generic syntax; comments explain
  the non-obvious *why* in one or two lines.

## Testing

- Tests drive the real services over `createTestRuntime()`; `runtime.restart()` is a
  force-quit + relaunch over the same in-memory disk (the old runtime's continuations
  become no-ops, like a killed process).
- Use `waitFor(predicate, description)` / `settle()`; no fake timers.
- `duplicateOnLostResponse.test.ts` reads `REPRODUCE_DUPLICATE_BUG=1` to run the same
  assertions against the legacy retry path. It must fail there and pass by default.

## SDK choice

The project is on **SDK 54** on purpose: SDK 55 needs Xcode 26.2+ and SDK 56/57 need
Xcode 26.4+, while this machine (and many reviewers') builds with Xcode 26.0. SDK 54
builds with Xcode 16.1+ and runs in the Expo Go 54 that is already on the simulator.
Keyboard handling therefore uses keyboard-controller 1.18's `KeyboardAvoidingView`
(`translate-with-padding`); `KeyboardChatScrollView` only exists from 1.20.

## Known limitations

- Single fan, single thread; the mock server lives in the app process, so a force-quit
  also "kills" requests that were in flight (see README).
- Access expiry is re-evaluated on refresh/reconnect, not on a timer.
- `FrameSampler` measures the JS thread only; UI-thread and memory numbers come from
  Perf Monitor / Instruments / Android Studio.
