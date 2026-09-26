# AI use

## Tools

- **Claude Code** (Claude Opus, in the Claude desktop app): scaffolding, most of the
  service and UI code, tests, refactors, debugging sessions and first drafts of the README.
  Its built-in browser read the task page and the Figma file; its iOS Simulator tool drove
  the simulator while debugging the benchmark.
- **Expo / FlashList / keyboard-controller docs**, read directly to check what the AI
  claimed about versions and APIs.

I reviewed the generated code service by service (chat delivery, billing, the mock world)
and ran every required scenario by hand on a phone. `npm run check` (types, lint, tests)
gates every change.

## Output I checked or corrected

- **Wrong SDK.** The first scaffold was on Expo SDK 57. It needs Xcode 26.4+, while this
  machine (and many reviewers') builds with Xcode 26.0. Moved to SDK 54 (Xcode 16.1+, runs
  in Expo Go 54) and kept every native module inside Expo Go's set.
- **`jest` in `dependencies`.** `npx expo install jest-expo jest` put the test runner into
  runtime dependencies; moved to `devDependencies`.
- **Benchmark that measured itself.** The first scroll benchmark read the scroll offset
  from `onScroll`. FlashList ignores scroll events for ~100 ms after it shifts the list for a
  prepended page, so the benchmark pushed the list from a page-stale offset and produced a
  "before" series that wasn't comparable. Found by logging offsets frame by frame on the
  simulator; the benchmark now drives the offset itself and follows the row on screen. The
  first phone numbers were thrown away and re-measured with both variants in one Release
  build (dev-panel toggle).
- **List jump on older pages.** A same-day "Today" separator sat at index 0 and kept its key
  when an older page landed, so FlashList's `maintainVisibleContentPosition` anchored to it
  and didn't shift the list. The separator above the oldest loaded message is now hidden
  while older history remains; covered by `buildChatListItems.test.ts`.
- **Keyboard.** The suggested `KeyboardAvoidingView` (`translate-with-padding`) applied its
  padding after the animation, so the list re-scrolled once the keyboard settled. Replaced
  with one `KeyboardStickyView` for list, gift strip and composer. `KeyboardChatScrollView`
  would be better but needs keyboard-controller 1.20+, which Expo Go 54 doesn't ship.
- **Prefetch threshold.** Raising `onStartReachedThreshold` looks free, but FlashList fires
  `onStartReached` only when the list *enters* the start zone. A zone taller than one page
  would leave the list inside it after a prepend and stop paging, so the fix is capped at
  4 screens (below one 50-message page).
- **Stale bundles.** Two "results" came from Expo Go still running an old bundle after a
  Metro restart; since then numbers only come from a fresh Release install.

## What I'm still unsure about

- **Performance** numbers come from one iPhone and a simulated 350 ms network. UI-thread
  frame timing and native memory weren't measured (JS thread and Hermes heap only).
- **FlashList internals.** The benchmark relies on observed FlashList v2 behaviour (the
  scroll-event pause, anchor selection); a library update could change it.
- **In-process mock.** A force-quit also kills requests in flight on the "server"; a real
  backend keeps processing them. The lost-response case is simulated explicitly instead.
- **Store rules** for creator content, adult content and external payment links differ by
  storefront and change often; the summary in the README needs a check against the current
  guidelines before any release.
