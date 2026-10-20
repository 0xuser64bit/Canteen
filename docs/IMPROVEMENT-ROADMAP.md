# Canteen improvement roadmap

Updated 20 October 2026. This is a working record of completed improvements and
the next areas to investigate. Future work is exploratory; prioritize it using
observed student journeys and concrete defects.

## Completed implementation: October 2026

- Sign-in keeps the requested email fixed during delivery, prevents overlapping
  verification, and recovers from failed requests without discarding useful input.
- Campus and Everyone preserve relevant topic, question and ordering filters.
  Latest works in the question queue. Opportunities omits incompatible question
  filters. Empty states describe the active filters and offer a clear way out.
- Feed pagination keeps loaded posts through failures and offers an explicit retry.
  Search also supports retry, ignores stale responses, and pauses while closed.
- Thread links carry a validated reading destination through notifications,
  search, Trending and reply pages. Direct thread opens return to My campus.
- Private collections follow a compact account summary. Settings and sign-out
  remain reachable before long collections; long email addresses wrap.
- Shared form fields and replies use readable mobile text. Thread back and send
  controls have larger touch targets.
- Poll voting rechecks account access. Urgent safety reports receive priority in
  moderation. Reply retries reuse their submission after a lost acknowledgement.
- The public `/updates` page records these changes and links to commit history.
- A signed Kotlin Android APK shares the mobile web experience. Launch URLs are
  restricted to its configured origin; Digital Asset Links publishes the release
  certificate. A generic offline navigation screen caches no student content.

### Validation and delivery record

Integrated checks on 20 October 2026 used separate disposable databases for browser
journeys and destructive database tests. Real student inboxes were not used.

| Check                                           | Result / evidence                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting and lint                             | Passed                                                                                                                                                                        |
| Type checking                                   | Passed                                                                                                                                                                        |
| Unit, interaction and native PostgreSQL tests   | 257 passed across 25 files; 20-second test timeout under concurrent build load                                                                                                |
| Native PostgreSQL privacy and concurrency tests | Included above, no skipped database suite                                                                                                                                     |
| Production web build                            | Passed                                                                                                                                                                        |
| Visual review                                   | Phone at 390px, dark theme: campus, composer, thread and account reviewed; final desktop/light and real-device checks remain                                                  |
| Student account journeys across campuses        | Stanford/MIT development OTP, campus-only denial, public question/reply, filtered return navigation, sign-out passed                                                          |
| Android APK build, tests and emulator review    | Record in `ANDROID.md`                                                                                                                                                        |
| Deployment and live smoke checks                | Vercel production Ready; updates, worker, manifest and release asset links return 200; health 200; signed-out campus sends login redirect; release domain verified by Android |

## Next investigations

| Priority | Area                                  | Evidence to collect and completion criteria                                                                                                                                                                                                                     |
| -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Android on real hardware              | Install the signed APK on a real phone. Exercise sign-in, keyboard, photo picker, deep links, gestures, text scaling and app updates. Record device/browser versions and observed defects before public distribution.                                           |
| 2        | Offline and installation experience   | Network-only recovery is implemented and covered by worker and registration tests. Finish real-browser offline/reconnection, cold launch and verified fullscreen review. Avoid caching private discussions without an explicit design.                          |
| 3        | Large moderation queues               | Measure query time and rendered volume with large disposable report/appeal queues. Design bounded pagination that preserves urgent-first ordering and current permission checks.                                                                                |
| 4        | Trending relevance                    | Review how likes, replies, recency and unanswered questions affect the current ranking. Compare useful conversations with repetitive or stale posts using fixtures and observed aggregate behavior before changing the score.                                   |
| 5        | Campus and returning-student journeys | Continue with separate student accounts in the same and different campuses, an authorized host, and suspended access. Review first-post discovery, helpful answers, saved opportunities and notifications; preserve anonymity and accurate small-campus labels. |

## Working agreement

Ship one coherent improvement per commit with its relevant checks. Record the
user-visible change in `/updates` when it is ready to ship. Keep unresolved work
here with evidence and a clear next step. Test accounts and example content belong
in disposable fixtures, so public activity remains honest.
