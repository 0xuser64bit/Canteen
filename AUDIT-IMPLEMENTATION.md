# Audit implementation — 17 October 2026

This tracks the technical audit and product roadmap against the implementation after `a495c60`. Code completion does not establish production readiness: the deployment and human operating checks below remain necessary.

## Engineering findings

| Finding                            | Implemented behavior                                                                                                             | Regression coverage                                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| F01: draft account boundary        | Opaque session-owned storage; legacy drafts discarded; successful sign-out/deletion clears drafts; stale composers invalidate    | Storage ownership tests and mounted composer/account interactions, including failed sign-out/deletion and blocked storage |
| F02: provider-token retention      | Minimal Google scopes; account create/update hooks discard tokens; migration clears old tokens while retaining provider bindings | Installed Better Auth adapter create/update tests with synthetic tokens; seeded database upgrade check                    |
| F03: migration/erasure race        | Post deletion queues the transaction's current image; account deletion locks relevant posts before taking the media snapshot     | Both migration/erasure commit orders with native PostgreSQL and mocked Blob storage                                       |
| F04: staff OTP blocked by hint     | Eligibility hint is advisory; authentication remains authoritative                                                               | Mounted sign-in with unknown hint, plus authentication endpoint eligibility tests                                         |
| F05: report/KEEP race              | Reports and moderation coordinate through the content author's lock and a transaction                                            | Concurrent report/KEEP for posts and replies; existing moderation and appeal tests                                        |
| F06: deletion resets quotas        | Bounded publication events survive content deletion and cascade on account deletion; image attempts have admission limits        | Concurrent limits, erase-and-republish attempts, retention and migration backfill checks                                  |
| F07: shared destination lost       | Validated local return path survives OTP and Google callback configuration; destination rechecks access                          | Malicious redirect inputs, OTP interaction coverage and existing visibility tests                                         |
| F08: unseen alerts acknowledged    | Paginated alerts acknowledge only delivered ID/revision pairs; acknowledgments and coalescing share a lock                       | More than 50 alerts, concurrent arrivals, stale versions and foreign ownership                                            |
| F09: reply history lost            | URL-backed historical reply pages refresh through normal visibility checks                                                       | Historical/focused pages survive revisions and remove hidden replies                                                      |
| F10: stale poll props              | Optimistic state derives from current server props                                                                               | Mounted prop refresh and failed optimistic vote rollback                                                                  |
| F11: failed send overwrites typing | Failed text restores only into an empty editor, otherwise stays separately recoverable                                           | Returned and thrown failures while typing a newer reply                                                                   |
| F12: incomplete draft recovery     | Drafts preserve publishing fields and a retry ID until confirmed success; image bytes remain local to the current editor         | Complete opportunity/poll recovery, failure/success handling and idempotent publication                                   |
| F13: inaccessible images           | New uploads require a bounded author description, rendered in feed, thread and moderation views                                  | Server validation before upload work and description validation tests; legacy images explicitly lack descriptions         |
| F14: inaccurate trust claims       | Verification, aliases, campus hosts, invitations and retention copy describe actual limits                                       | Source review across public pages, campus empty states and operating documentation                                        |

## Product and operations work

- Campus hosts are explicitly assigned through `CAMPUS_HOSTS`, require current team eligibility and default to no access. `/host` exposes assigned campuses only; staff contributions remain labeled and revocation removes normal campus access and reply alerts.
- Waiting questions support oldest-first ordering, topic filters and no-reply filtering. Host waiting totals below five are suppressed.
- Helpful answers and reply alerts link to the relevant reply page through the existing visibility rules.
- `/university-request` collects a domain and official HTTPS homepage without requester identity. `/launch` provides private review; acceptance requires a separately verified dataset update.
- Opportunities support closing-soon sorting, including private saves. Existing closed history remains accessible through normal permissions.
- Maintenance drains bounded deletion batches, expires limiter/activity/domain-request data and records success/failure. `/launch` shows stale maintenance, overdue deletion work and waiting reports/appeals. This does not configure an external alerting service.

## Verification completed locally

- Formatting, lint and fresh Next.js/TypeScript generation passed.
- All 187 tests passed, including the 74 database tests against a newly created native PostgreSQL 14 database. Email and Blob traffic remained mocked.
- A fresh database accepted all 16 migrations. A separate seeded database upgraded through the six audit migrations without losing existing content or account bindings; token cleanup, publication backfill and notification defaults were checked.
- The ordinary optimized production build passed, including the Google Fonts fetch.
- Production dependency audit passed across 207 packages. The full audit still reports the development-only `braces` advisory documented in `SECURITY.md`.
- The preceding implementation session recorded local browser checks for staff OTP, host scope, desktop/mobile rendering, draft reload/cross-tab clearing, account switching and historical helpful-answer navigation. This continuation added native PostgreSQL verification and account lifecycle component regressions; it did not repeat that complete browser walkthrough.

These are local results, not proof of a remote CI run or a deployed service check. Synthetic provider-token persistence checks do not constitute a real Google OAuth exchange. Component tests do not establish complete screen-reader or device compatibility.

## Deployment and human handoff

Follow the ordered procedure in [LAUNCH.md](LAUNCH.md#deployment-and-migration-sequence). Before inviting students:

1. Assign real campus hosts, moderation ownership, coverage hours and a domain-review owner. Confirm the campus access disclosure before configuring any assignments.
2. Provision isolated preview database/storage credentials and verify real OTP delivery plus fresh/returning Google sign-in when enabled.
3. Back up production, review migration write/lock cost, then apply the six audit migrations before serving this code. Token cleanup is permanent; preserve `BETTER_AUTH_SECRET` and provider account bindings.
4. Configure authenticated maintenance and external alert delivery to the operational owner. Confirm the success heartbeat advances, overdue erasure work drains and failures reach that owner. Monitor aggregate sign-in/publishing failures without exporting identities or content.
5. If legacy public images exist, confirm erasure in the storage provider before declaring them private or removed. Retain the legacy storage token until that work finishes.
6. Review deployed privacy/backups and perform the provider's backup/restore drill. Run a small supported pilot and use real feedback before expanding campuses or setting adoption targets.

No production migration, credential change, host assignment, deployment, outreach or external storage/email operation was performed by this continuation. No DMs, public profiles, AI moderation, WebSockets, new search service or application platform were added.
