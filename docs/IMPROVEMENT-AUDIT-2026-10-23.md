# Canteen product and engineering audit — 23 October 2026

Baseline: `02b346d`. Implementation through `69b3bf5`. This records a finite,
evidence-based pass; it is not a claim that every defect or future product need
has been exhausted. The product remains campus-first, with per-thread aliases,
accurate verification claims and no public identity or popularity profiles.

## Scope and method

Reviewed product/design intent, recent history, the existing roadmap and
contribution rules before changing code. Used the Improve audit checklist,
Impeccable refinement guidance and Ponytail's smallest-complete-change rules.
Read the installed Next.js guides for server actions, route handlers and testing.
Three parallel source reviews covered backend privacy, student interaction
correctness and operational/query behavior. Findings were checked against the
actual callers and tests before implementation.

Areas covered:

- Authentication and session revocation, campus visibility, serialized discussion
  payloads, server-action validation, publication limits and retry identities.
- Feed pagination, polls, collections, search, composer, threads, notifications,
  sign-in, account actions, settings and shared Radix-based UI primitives.
- Reporting, moderation, appeals, host queues, university requests, private image
  delivery and erasure, maintenance and aggregate measures.
- Android origin handling and network-only offline behavior in source; CI,
  dependency posture and development checks.

The app's existing tests and privacy model were strong. The work targets concrete
gaps around successful-action state, failed transport and current authorization,
without changing the visual identity or introducing dependencies or migrations.

## Implemented findings

All findings below were high-confidence source defects. Privacy fixes carry
medium regression risk because they affect shared read rules; real database tests
cover both denial and permitted behavior. Other fixes have low regression risk
and focused interaction coverage. Effort was small per item.

| Priority | Finding and impact                                                                                                                                                                          | Implementation and evidence                                                                                                                                                                                                                                                                                                                                                             | Commit    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| P1       | A publishing transport rejection escaped the form action. Fields remained editable during submission, allowing unsent edits to disappear on success.                                        | `components/composer.tsx` catches rejection, preserves the draft/id and freezes submitted fields. `test/interactions.test.tsx` covers a failed request and successful same-id retry.                                                                                                                                                                                                    | `5115fcb` |
| P1       | Staff status allowed unrestricted image reads from unreported campus posts.                                                                                                                 | `app/api/images/[id]/route.ts` limits the moderation exception to open post reports. Database tests cover host assignment/revocation, hidden reported images, resolution, non-team and suspended access.                                                                                                                                                                                | `a5a731a` |
| P1       | Reported text was visually clamped with no expansion, including items whose thread could not be opened. A decision could be made without reading the remainder.                             | `components/mod-queue.tsx` shows the complete body. Long hidden post/reply rendering is covered by `test/mod-queue.test.tsx`.                                                                                                                                                                                                                                                           | `37cf8f9` |
| P1       | Likes, poll results and collection labels reverted after success on locally paginated posts; route refresh replaces only the first server-rendered page.                                    | `components/post.tsx`, `poll.tsx` and `post-menu.tsx` retain confirmed action state while accepting fresh props. `test/action-state.test.tsx` exercises a real loaded feed page, subsequent failure rollback and prop updates.                                                                                                                                                          | `b96f38e` |
| P1       | Combining an uncertain earlier reply with newer writing changed its retry identity and could duplicate a committed reply. Helpful-answer transport rejection also escaped the conversation. | `components/thread.tsx` retries each uncertain reply separately and catches helpful-answer failure. Tests verify identical original body/id across failures, newer draft preservation and a distinct id for its later send.                                                                                                                                                             | `ee2e79e` |
| P1       | Appeal and moderation transport failures escaped local handling and could lose typed context or decision state.                                                                             | `components/appeals.tsx` and `mod-queue.tsx` preserve input/reason, explain failure and permit retry. Appeal input stays fixed while pending. `test/appeals.test.tsx` and `test/mod-queue.test.tsx` cover failure and recovery.                                                                                                                                                         | `0fdb776` |
| P1       | Ownership bypassed campus authorization after a host assignment ended, exposing the host's campus threads and other students' replies.                                                      | Shared `visibleTo` in `server/queries.ts` enforces current audience even for own hidden content. Applied to thread/comments, own feed, image/update routes and helpful-answer mutation. Reply emails require an eligible recipient; assigned hosts receive valid moderation thread links. Erasure rights remain. Real database tests cover revocation and normal authors' hidden posts. | `7c85a31` |
| P2       | A hidden previously helpful answer reopened the feed question but was omitted from host waiting totals.                                                                                     | `server/operations.ts` matches the feed's visible-helpful-answer rule. A five-question database fixture verifies the oldest/count and small-group suppression after restoration, plus unauthorized denial.                                                                                                                                                                              | `7bbdaae` |
| P2       | Twelve busy small campuses could crowd every eligible university out of discovery before privacy filtering.                                                                                 | `getActiveUniversities` applies the membership threshold before ranking four results. A 16-campus fixture failed on the baseline and passes now; hidden, campus-only, expired and old posts remain excluded.                                                                                                                                                                            | `65e705c` |
| P2       | A saved opportunity retry could fail future-deadline validation after publication, leaving its author unable to confirm the successful post.                                                | `server/actions.ts` acknowledges an owned, validated retry id after authentication/session/campus checks and before new-post validation. Database tests confirm one post/quota event and no cross-author acknowledgement.                                                                                                                                                               | `ab9326f` |
| P2       | Domain request failures could escape the form or reset useful input.                                                                                                                        | `components/university-request.tsx` keeps controlled fields and catches transport failure. Returned and thrown failure/retry cases are covered by `test/university-request.test.tsx`.                                                                                                                                                                                                   | `07d0724` |
| P2       | Several writing, dialog, search and discussion targets were 20–40px, and remaining small text inputs could trigger phone zoom.                                                              | Existing UI primitives and custom controls use 44px targets where appropriate; compact buttons/like/reply actions expand on coarse pointers. Composer groups wrap and poll/application fields use 16px text. Existing interaction tests pass; final visual/device review remains open.                                                                                                  | `69b3bf5` |

## Verification

| Check                     | Evidence                                                                                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                  | Format, lint and types passed; 309 tests passed when the native database suite was enabled.                                                                                                                                                                                                               |
| Final integrated checks   | `TEST_DATABASE_URL=<fresh disposable database> bun run check`: 331 tests passed across 35 files; no skipped database suite; formatting, lint and types passed.                                                                                                                                            |
| Focused regression checks | Ran with each implementation. The busy-campus fixture was observed failing before its fix.                                                                                                                                                                                                                |
| Production build          | `bun run build` passed with isolated local database configuration and external delivery services disabled.                                                                                                                                                                                                |
| Local production HTTP     | Landing, updates, community, manifest and worker returned 200; private image/update APIs returned 401 while signed out. Campus emitted Next's documented streamed sign-in redirect. Health returned the expected 503 for a fresh database without a maintenance heartbeat. Security headers were present. |
| Runtime dependency audit  | `bun audit --production`: no advisories across 207 packages.                                                                                                                                                                                                                                              |
| Browser                   | Local landing, development OTP sign-in and dark desktop campus reviewed; composer route loaded. Browser access was subsequently disabled in Work settings.                                                                                                                                                |
| Data isolation            | Fresh integration and browser databases; tests mock email/Blob delivery. No production data, credentials, schema or deployment changed.                                                                                                                                                                   |

No new dependencies or schema migrations. Commits use Conventional Commits and
contain no co-author trailer. Public `/updates`, product/design guidance and the
roadmap accompany the implementation.

## Decisions and remaining investigations

1. **Finish visual and device verification.** Review 320px/390px phones and
   desktop, light/dark and soft/vivid themes, 200% text, keyboard focus, dialogs,
   long campus names, photo picking and the new retry controls. Source-level
   wrapping and target changes are not proof of real touch behavior. Recheck
   offline/reconnection and the Android shell on real hardware.
2. **Measure large moderation queues before pagination.** `getModQueue` caps 100
   posts and 100 replies, prioritizing urgent reports before each cap. Decisions
   refresh the route, making later items reachable; the cap is not permanent data
   loss. Measure query time and serialized/rendered volume with large disposable
   queues. If needed, use one combined urgent-first keyset cursor, preserving
   current authorization and behavior when decisions remove earlier items.
3. **Measure follower notification fan-out.** `addComment` performs per-recipient
   work inside its transaction. No latency/load claim was established. Use
   disposable 0/10/100/1000-follower fixtures and concurrent replies before choosing
   batching, while keeping notification uniqueness, recipient access and rollback.
4. **Validate discovery quality with real use.** The correctness bug is fixed;
   changing trending ranking still needs evidence about useful vs stale or
   repetitive conversations. Do not invent activity or engagement metrics.
5. **Explore product additions from observed friction.** Prioritize whether
   students receive helpful replies, can find unanswered campus questions and
   return to saved opportunities. These existing flows need real student evidence
   before adding unrelated engagement features.

## Considered and retained

- Retained per-thread aliases, hidden small-campus labels, identity-minimal
  moderation and internally linkable account records with honest disclosure.
- Retained browser-local session-owned drafts without saved image bytes; no
  account-sync or private discussion cache was introduced.
- Retained ten-second visible-thread polling and daily bounded maintenance:
  documented operating choices, not defects established by this review.
- Retained the existing Radix/shadcn-style primitives and design tokens instead
  of replacing them with a second component system.
- Dependency updates were not justified by the clean runtime audit. Hardware,
  real providers, production load, hosting/backups and formal accessibility
  certification were not tested in this pass.
