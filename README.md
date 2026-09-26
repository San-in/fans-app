# FanSuite fan chat — test task

A fan ↔ creator chat screen with a subscription paywall, built with Expo SDK 54, React
Native 0.81 (New Architecture) and TypeScript. There is no production backend: a mock
server, a mock app store and a simulated network run in-process and persist to their own
SQLite files, so every failure case below can be reproduced on a device and survives a
force-quit.

## Demo platform

| | |
|---|---|
| Recorded on | iPhone 17 (physical), iOS 26.6.1 |
| Build mode for recordings | Release (`npm run ios:release -- --device`) |
| Build mode for performance | Release, Hermes (`npm run ios:release -- --device`) |
| Other platform | Android — see below. Tested: **TODO yes / no** |

## Run it

Requirements: Node ≥ 20.19.4 (`nvm use` picks 22 from `.nvmrc`), Xcode 16.1+ and
CocoaPods for native iOS builds, Android Studio for Android. No accounts or credentials are needed.

```bash
npm install
npm test                  # focused tests
npm run ios               # quickest: Expo Go 54 on the iOS simulator (all modules used are in Expo Go)
npm run ios:dev-build     # or a native development build
npm run ios:release       # Release build — use for performance numbers
```

Android: `npm run android` (Expo Go) or `npm run android:dev-build` / `npm run
android:release` with an emulator running. CocoaPods needs a UTF-8 locale; if `pod
install` fails with `Unicode Normalization not appropriate for ASCII-8BIT`, run
`export LANG=en_US.UTF-8` first.

## Simulation controls

Every failure case is reproduced in the app itself — no scripts or flags. Open the **⋮**
button in the chat header (Simulation controls) and the **Simulation** card on the paywall.

| Where | Section | What it does |
|---|---|---|
| Chat header **⋮** | Network | **Offline** (survives a force-quit) · latency Fast 50 / Normal 350 / Slow 1500 ms |
| | Next send | one-shot faults for the next request: **Lose response** (the server stores it, the reply is lost), **Server error 503**, **Rate limit 429** · Clear |
| | Incoming | **Ethan sends 4 messages** — written straight into the server; while offline they only come back through catch-up |
| | Bugs & repeats | **Legacy retry (duplicate bug)** — the original bug · **Repeat every event** — realtime and store events arrive twice |
| | Billing | **Purchase on another device** (for Restore) · **Expire All Access** |
| | Performance | prefetch ½ / 4 screens ahead (before / after) · **Run scroll & type benchmark** |
| | State | live counters: app outbox, loaded messages, backend-confirmed access, messages the server accepted, pending confirmations, store ledger |
| | **Reset everything** | wipes all four databases |
| Paywall | Simulation | store result **Success / Cancel / Fail** · backend confirmation **Instant / Delayed (6 s) / Manual / Reject** · **Backend: confirm N pending** |

The **State** card is the quickest proof of "one copy": it shows how many messages the
server actually accepted, next to what the thread shows.

## Reproducing the required scenarios

| Scenario | Steps |
|---|---|
| Offline queue survives a force-quit | ⋮ → **Offline** on → send three messages (each shows *Waiting for network*) → force-quit (swipe away / `adb shell am force-stop com.sanin.fanschat`) → reopen: still offline, all three still waiting. |
| Missed messages + no duplicates | While still offline: ⋮ → **Ethan sends 4 messages** → **Offline** off. The four arrive through catch-up first, then the three queued messages are sent once, in the order typed. |
| Lost response, then retry | ⋮ → **Lose response** → send. The server stores it, the reply never arrives, the client times out and retries with the same clientId → one copy. Tap **Lose response** 3× to exhaust the automatic attempts and retry by hand from the failed bubble. |
| Reproduce the original bug | ⋮ → **Legacy retry (duplicate bug)** on → **Lose response** → send → two copies appear. |
| Failure that needs a different action | Send a message containing a link → rejected with an explanation and **Edit**. Send more than the 10 free messages → **Get All Access**; once the purchase is confirmed, the held message is sent on its own. Newer messages appear below a failed one. |
| Purchase / cancel / fail | Paywall → Simulation → Store result **Success / Cancel / Fail** → Subscribe. |
| Delayed confirmation | Backend confirmation **Delayed** (6 s) or **Manual** → Subscribe → *Payment received — confirming your access*; access unlocks only when the backend confirms (**Backend: confirm pending** for Manual). |
| Restore | ⋮ → **Purchase on another device** → paywall → **Restore purchases**. |
| Unrelated failure keeps access | With All Access active: Store result **Fail** → gift button in the composer → gift fails, All Access stays. |
| Repeated events | ⋮ → **Repeat every event** on, then send / buy a gift: no duplicate bubbles, one gift message. |
| Scroll & type benchmark | ⋮ → **Run scroll & type benchmark**. |

## The duplicate-message bug

**What happened.** A send reached the server and was stored, but the response was lost.
The retry path called "send" again, which minted a **new id** for the message. The server
had no way to know the second request was the same message, so it stored a second copy;
the thread showed both once they synced.

**Fix — two halves:**

1. **Client:** the clientId is minted once, when the message is composed, persisted with
   the outbox record *before* the message is shown as queued, and reused by every retry —
   automatic, manual or after a restart (`ChatEngine.sendMessage`, `sendItem`).
2. **Server:** the mock server remembers every accepted `(authorId, clientId)` across
   restarts and returns the original message (`wasDuplicate: true`) instead of storing a
   copy. The check runs before the quota, so retrying an accepted message never burns a
   free message (`ServerChat.accept`).

All confirmation paths (response, realtime echo, catch-up) reconcile through one function
keyed by clientId and message id, so repeated responses can't add copies either.

**Test that fails for the broken behaviour.**
`src/services/chat/__tests__/duplicateOnLostResponse.test.ts`

```bash
npm test                    # passes: 1 copy
npm run test:duplicate-bug  # same test against the legacy retry path: fails, "Expected: 1, Received: 2"
```

## Decisions

- **Storage:** `expo-sqlite/kv-store` with a **synchronous** API and one database file per
  system (app, mock server, mock store, dev settings). A synchronous commit is what makes
  "persist before treating as queued" literal. MMKV would work too but needs a dev build;
  this way the whole project also runs in Expo Go.
- **Order:** the server's `seq` is the only order. Queued messages render after confirmed
  ones in local order; the outbox drains serially, and a message in backoff blocks the ones
  behind it so the server never assigns them earlier seqs. A **failed** message stays where
  it failed, so newer messages land below it; retrying moves it to the end, where its new
  seq will be.
- **Held by the free limit:** once All Access is confirmed, messages rejected for the quota
  are sent automatically (same clientId), instead of waiting for a manual retry.
- **Realtime:** a mock socket that only delivers while connected. After every (re)connect
  the client catches up by cursor before sending — push is never trusted for completeness.
- **No jumping:** own messages keep the key `c:<clientId>` from pending to confirmed, and
  confirmation removes the outbox entry and inserts the message in a single state update.
- **Paid access:** the design's "Available messages" line is the paid feature — free fans
  get 10 messages, All Access is unlimited — plus gifts as a consumable. Access is only
  ever set from a backend answer (`AccessService.apply`).
- **List:** FlashList v2 with `maintainVisibleContentPosition` (`startRenderingFromBottom`)
  instead of an inverted list and `onStartReached` pagination. A bubble that grows at the
  bottom (failure actions) is kept in view if the reader was at the end.
- **Keyboard:** list, gift strip and composer move up as one `KeyboardStickyView`, in sync
  with the keyboard; nothing resizes, so the list never re-scrolls. `KeyboardAvoidingView`
  `translate-with-padding` was tried first and dropped: it applies its padding after the
  animation, which made the list jump once more. `KeyboardChatScrollView` needs
  keyboard-controller 1.20+, which Expo Go 54 doesn't ship. Trade-off: while the keyboard is
  open, the top of the list slides under the header. On iOS a pending autocorrection can
  land after the composer is cleared; the composer ignores edits in the first 300 ms after a
  send so the field stays empty.
- **Feedback:** toasts for every simulation control and for access changes (drawn over
  modals), haptics for sends, failures, purchases, switches and segments. Figma icons are
  react-native-svg components.
- **SDK 54:** newer SDKs need Xcode 26.2+ (55) or 26.4+ (56/57); 54 builds with Xcode 16.1+,
  so reviewers can run it with an older toolchain too.
- **Navigation:** React Navigation native-stack (three screens) rather than Expo Router.

## Payments in production

- **Store billing:** StoreKit 2 / Play Billing through `react-native-iap` or RevenueCat.
  Keep the same shape: purchase → persist the transaction → send it to the backend →
  finish/acknowledge only after the backend has recorded it. Listen to the update stream
  (renewals, Ask to Buy, purchases from other devices) and process unfinished transactions
  on launch.
- **Backend validation:** verify with the App Store Server API (signed JWS transactions)
  and the Google Play Developer API (`purchases.subscriptionsv2`, then acknowledge). Key
  everything by `originalTransactionId` / purchase token so each transaction applies once,
  and bind it to the account (`appAccountToken` / obfuscated account id).
- **Expiry and refunds:** App Store Server Notifications V2 and Play Real-time Developer
  Notifications update the entitlement server-side (renewal, grace period, billing retry,
  expiry, refund/revoke); the app re-reads access on launch, on reconnect and on a push
  event. The client never computes access on its own — it only caches the last answer.

## Tests

`npm test`:

```
PASS src/services/chat/__tests__/buildChatListItems.test.ts
PASS src/mock/server/__tests__/MockServer.test.ts
PASS src/services/chat/__tests__/restartRecovery.test.ts
PASS src/services/chat/__tests__/duplicateOnLostResponse.test.ts
PASS src/services/chat/__tests__/outboxDelivery.test.ts
PASS src/services/billing/__tests__/delayedConfirmation.test.ts
PASS src/services/billing/__tests__/purchaseFlows.test.ts

Test Suites: 7 passed, 7 total
Tests:       25 passed, 25 total
```

`npm run test:duplicate-bug` runs the same duplicate test against the legacy retry path and
fails as it should:

```
✕ ends with exactly one copy after the retry
  Expected: 1
  Received: 2
Tests:       1 failed, 1 passed, 2 total
```

(The force-quit case passes there too: after a restart the catch-up runs before the outbox
drains and finds the accepted message by its clientId, so nothing is resent. The bug is the
in-session retry minting a new id.)

| Test | Covers |
|---|---|
| `chat/duplicateOnLostResponse` | lost response → retry → one copy; lost response → force-quit → one copy |
| `chat/restartRecovery` | persisted before shown; 3 offline messages survive a restart, 4 missed messages recovered first, each send stored once |
| `chat/outboxDelivery` | local order with a failing head, repeated realtime events, give-up + manual retry, rejection needs edit, quota, held message sent after All Access, a failed message keeps its place across a restart |
| `billing/delayedConfirmation` | no access while the backend is pending; resume after a force-quit mid-verification |
| `billing/purchaseFlows` | double tap, cancel, unrelated failure keeps access, repeated store events, restore, expired restore |
| `mock/MockServer` | idempotency, persistence, deterministic 50k history paging |
| `chat/buildChatListItems` | no day separator above the oldest loaded message while older history remains (it anchored the list and made it jump on prepend); separators where a day really starts |

## Performance

Measured on a physical iPhone 17, iOS 26.6.1, Release build (Hermes), mock latency 350 ms.
Method:

1. `npm run ios:release -- --device` (Release, Hermes).
2. ⋮ → **Performance** → pick the variant (**½ screen ahead** = before, **4 screens ahead** =
   after). Both variants live in the same build, so nothing else changes between them.
3. ⋮ → **Reset everything**, then ⋮ → **Run scroll & type benchmark**. It scrolls to the
   bottom, then flings up for 240 frames at a steady 80 px per frame (~19,000 px; pages load
   as it goes), types a 67-character sentence and flings back down. Same steps and the same
   seeded history every run; a run that didn't start from a reset is flagged as not
   comparable.
4. The alert (and `[perf] {…}` in the log) reports JS frame timing overall and per phase
   (scroll up / typing / scroll down), and how long the scroll-up sat at the top of the
   loaded window waiting for the next page.
5. 3 runs per variant, medians below.

| Variant | JS FPS avg / min | Dropped JS frames (up / typing / down) | Longest JS frame | p95 | Waiting at the top | Messages loaded | JS heap |
|---|---|---|---|---|---|---|---|
| before — older page requested ½ screen ahead | 59.4 / 58 | 6 (6 / 0 / 0) | 52 ms | 17 ms | **1,000 ms** | 50 → 200 | 12 → 20 MB |
| after — 4 screens ahead | 59.5 / 58 | 8 (6 / 1 / 0) | 46 ms | 17 ms | **63 ms** | 50 → 300 | 12 → 20 MB |

Raw runs — before: waiting 996 / 1,000 / 1,004 ms, dropped 6 / 6 / 7, longest 52 / 51 / 55 ms.
After: waiting 68 / 58 / 63 ms, dropped 8 / 7 / 8, longest 51 / 42 / 46 ms. One "after" run
was the second in the same app session and read a JS heap of 24 → 28 MB (the previous run's
heap not collected yet); the heap column uses the other two.

**Bottleneck: pagination, not rendering.** The JS thread kept ~60 fps in both variants. But
with the older page requested half a screen before the top, which a fast fling covers in
~0.1 s while a page takes ~350 ms, the list sat pinned at the top for about a quarter of the
~4 s scroll-up — ~330 ms per page. **Change:** request it 4 screens ahead
(`onStartReachedThreshold`). The wait drops from 1,000 ms to 63 ms, and in the same 240
frames the list travels ~30 % further through the history (300 messages loaded instead of
200).

**Cost:** two more dropped frames per run (5 page prepends instead of 3, each costing a frame
or two) and one extra page of messages in memory. The threshold must stay below one page's
height: FlashList fires `onStartReached` only when the list *enters* the start zone, so a zone
taller than a page would leave the list inside it after a prepend and stop paging. A residual
~60 ms (about 4 frames) of waiting remains with 4 screens; I haven't traced which page causes
it.

**The benchmark had bugs first.** FlashList ignores scroll events for ~100 ms after it shifts
the content for a prepended page, so the first version of the benchmark pushed the list from
a page-stale offset. Its first phone series was discarded; the benchmark now drives the
offset itself and follows the row on screen. The same investigation found a real list bug:
a same-day "Today" separator at index 0 kept its key on prepend, so
`maintainVisibleContentPosition` anchored to it and the list jumped. The separator above the
oldest loaded message is now hidden while older history remains (`buildChatListItems` test).

**Not measured:** native (process) memory and UI-thread frame timing — the JS heap comes
from Hermes; Xcode Instruments / Android `dumpsys` weren't used. Numbers are from one phone
and a simulated network; they are not proof for slower devices or real latency.

## Platform limitations

- The mock server runs inside the app process, so force-quitting also stops requests that
  were in flight; a real server would keep processing them. The lost-response case
  (accepted, reply lost) is simulated explicitly instead.
- Paid access expiry is re-evaluated on refresh/reconnect, not on a timer.
- **TODO** — anything found while testing on Android.

## Resuming a large media upload (not built)

Use a resumable protocol (tus, or S3 multipart / GCS resumable sessions) with a
server-issued upload id stored next to the local file reference in the outbox, and ask the
server for the committed offset before sending the next chunk. **Backgrounding:** hand the
transfer to the OS — a background `URLSession` upload task on iOS, WorkManager (or a
foreground service with a notification) on Android — so it continues while the app is
suspended. **Force-quit / force-stop:** iOS cancels background transfers when the user
force-quits, and Android's force-stop kills the process and cancels its scheduled work
until the user opens the app again; nothing runs, so on the next launch the outbox finds the
unfinished upload, queries the committed offset and resumes from there instead of starting
over.

## Store rules that shape the scope

- Apple **3.1.1** — unlocking subscriptions or premium content must use in-app purchase;
  IAP may be used to let customers tip digital content providers; restorable purchases need
  a restore mechanism. **3.1.2** — auto-renewing subscriptions must give ongoing value and
  work across the user's devices. **3.1.1(a) / 3.1.3** — links or buttons to web purchases
  are allowed on the US storefront, via entitlements in some regions, and not elsewhere.
  **1.2 / 1.2.1** — creator and user-generated content needs filtering, reporting, blocking,
  published contact info and, for creator apps, age restriction for content above the
  app's rating. **1.1.4** — no overtly sexual or pornographic material. **5.1.1(v)** —
  in-app account deletion.
  <https://developer.apple.com/app-store/review/guidelines/>
- Google Play **Payments** — digital content, features and subscriptions must use Play
  Billing unless the app is enrolled in an alternative-billing / external-offers program in
  an eligible region; physical goods and peer-to-peer payments must not.
  <https://support.google.com/googleplay/android-developer/answer/9858738>
  **User Generated Content** — terms accepted before posting, moderation, in-app reporting
  and blocking, and monetization must not reward objectionable content.
  <https://support.google.com/googleplay/android-developer/answer/9876937>

**Effect on scope:** the paywall and gifts go through store billing (simulated here);
chat is user-generated content, so the production app needs report and block actions,
moderation and an age gate on creator content; anything adult stays off the store builds
(web only); links to web checkout are storefront-dependent and off by default.

## Time spent

About 8 hours:

| | |
|---|---|
| Setup and development | ~3 h |
| Reading through and verifying the generated code | ~2 h |
| Running the required scenarios, fixing what they exposed, measurements and this report | ~3 h |
