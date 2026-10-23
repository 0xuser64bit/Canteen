# Canteen improvement roadmap

Updated 23 October 2026. This is a working record of completed improvements and
the next areas to investigate. Future work is exploratory; prioritize it using
observed student journeys and concrete defects.

## Completed implementation: 23 October 2026

The [audit and implementation record](IMPROVEMENT-AUDIT-2026-10-23.md) captures
the reviewed areas, evidence, twelve implementation commits and remaining work.

- Campus image reads and former-host thread access obey current permissions;
  ownership retains erasure rights without keeping expired campus access.
- Likes, polls, saves and follows retain confirmed state on paginated posts.
- Publishing, helpful answers, moderation decisions, appeals and domain requests
  recover locally from connection failures. Pending submissions keep their fields
  fixed. Uncertain replies retry separately without combining newer text.
- Moderation shows complete reported messages. Host waiting totals include
  questions whose previously helpful answer is now hidden.
- Busy-campus discovery filters privacy eligibility before limiting results.
  Saved opportunity retries still acknowledge publication after the deadline.
- Writing controls, search, menus and discussion actions have larger tap targets;
  composer groups wrap, and remaining writing fields use 16px text.

Validation: formatting, lint, types and **331 tests across 35 files** passed,
including the native PostgreSQL suite with no skips. The production build passed.
The production dependency audit found no advisories in 207 packages. Separate
fresh local databases isolated browser fixtures from destructive integration
tests. No production deployment, migration or student-data change was made.
Local production-mode HTTP checks also passed for public pages/assets, signed-out
API denial, the streamed campus sign-in redirect and security headers. The fresh
database correctly reported unhealthy maintenance until a heartbeat exists.

Local browser review reached the landing page, university-email sign-in and dark
desktop campus page; composer navigation loaded successfully. Browser access was
then disabled in Work settings, so final visual review of the new controls,
mobile/light-theme checks, offline/reconnection and real Android hardware remain
unverified. Earlier captures below describe earlier implementations.

## Earlier implementation: October 2026

- Soft dark accents use dark tinted message surfaces and light text across posts,
  replies, polls and the live Settings preview. Primary controls retain a clear
  accent; swatches follow intensity. Sending replies keep full text contrast.
- Default feeds omit the redundant Latest-only row. Filters and post menus have
  44px tap targets. Campus invitations use quieter secondary actions and leave
  the first-conversation prompt visible.
- Notifications retain New/Earlier grouping while being read, acknowledge exact
  delivered revisions and offer a bounded explicit retry after connection errors.
  Saved collection filters show selection and useful empty-state recovery.
- Reports, deletions, saves and follows recover from transport errors. Report
  reasons use native radios and retain selection. Cancelling native sharing does
  not copy a link; clipboard failures receive feedback.
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
journeys and destructive database tests. Real student inboxes were not used. The subsequent appearance and recovery pass
passed the integrated checks below. Its live visual review remains with the
founder on Android because connected browser use is disabled; the earlier phone
captures describe the prior implementation.

| Check                                           | Result / evidence                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting and lint                             | Passed                                                                                                                                                                        |
| Type checking                                   | Passed                                                                                                                                                                        |
| Unit, interaction and native PostgreSQL tests   | 309 passed across 31 files; 20-second test timeout under concurrent build load                                                                                                |
| Native PostgreSQL privacy and concurrency tests | Included above, no skipped database suite                                                                                                                                     |
| Production web build                            | Passed                                                                                                                                                                        |
| Visual review                                   | Phone at 390px, dark theme: campus, composer, thread and account reviewed; final desktop/light and real-device checks remain                                                  |
| Student account journeys across campuses        | Stanford/MIT development OTP, campus-only denial, public question/reply, filtered return navigation, sign-out passed                                                          |
| Android APK build, tests and emulator review    | Record in `ANDROID.md`                                                                                                                                                        |
| Deployment and live smoke checks                | Vercel production Ready; updates, worker, manifest and release asset links return 200; health 200; signed-out campus sends login redirect; release domain verified by Android |

## Next investigations

| Priority | Area                                  | Evidence to collect and completion criteria                                                                                                                                                                                                                     |
| -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Android on real hardware              | Founder installed the signed APK and reported basic use seems fine. Continue sign-in, keyboard, photo picker, deep links, gestures, text scaling and app updates. Record device/browser versions and observed defects before public distribution.               |
| 2        | Offline and installation experience   | Network-only recovery is implemented and covered by worker and registration tests. Finish real-browser offline/reconnection, cold launch and verified fullscreen review. Avoid caching private discussions without an explicit design.                          |
| 3        | Large moderation queues               | Measure query time and rendered volume with large disposable report/appeal queues. Design bounded pagination that preserves urgent-first ordering and current permission checks.                                                                                |
| 4        | Trending relevance                    | Review how likes, replies, recency and unanswered questions affect the current ranking. Compare useful conversations with repetitive or stale posts using fixtures and observed aggregate behavior before changing the score.                                   |
| 5        | Campus and returning-student journeys | Continue with separate student accounts in the same and different campuses, an authorized host, and suspended access. Review first-post discovery, helpful answers, saved opportunities and notifications; preserve anonymity and accurate small-campus labels. |

## Working agreement

Ship one coherent improvement per commit with its relevant checks. Record the
user-visible change in `/updates` when it is ready to ship. Keep unresolved work
here with evidence and a clear next step. Test accounts and example content belong
in disposable fixtures, so public activity remains honest.
