# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University students anywhere in the world. Sign-in verifies control of a recognized university email address; it does not independently establish current enrollment. They mostly arrive on phones, in short sessions between classes or late at night, to ask something they would not ask under their own name, or to read what students at their own and other universities honestly think.

## Product Purpose

Canteen is a campus-first discussion space for people who control a recognized university email address. Per-thread aliases help students ask candid questions about academics, campus life, careers, mental health, and opportunities without attaching a public profile. Success means students trust it enough to ask the real question and receive a reply they find helpful. Email verification does not prove current enrollment, and what someone writes or shares can still identify them.

## Positioning

University-email verification with per-thread aliases. Other students see an alias (for example "Quiet Otter"), not the author's email or account identifier; small campuses remain unnamed outside their campus until five members join. Aliases differ across threads, while Canteen can link account records internally. Campus-only posts are visible within the university and to explicitly assigned, labeled Canteen campus hosts. Host access is disabled by default and limited to configured campuses; moderators can review reported content. The private account page shows a student their own email, university and activity; it does not expose that information to other students.

## Operating Context

- Sign in with a university Google account when configured, or an 8-digit email code (no passwords). Production email codes require an email provider key.
- My campus is the signed-in starting point. Read by topic, oldest waiting, no replies, or Needs an answer; ask a question or start a conversation, reply, like, save privately, or follow replies. Question authors can mark another student's reply helpful and undo that choice.
- Feeds: My campus (own university, including campus-only posts), Everyone (all universities), Opportunities (internships, jobs, hackathons, scholarships), and a page per visible university. New posts default to a campus-only question.
- Thread replies update through periodic polling, with URL-backed earlier/latest reply pages that survive refresh and recheck visibility. Helpful answers and reply notifications link directly to their reading page. Notifications cover authors' replies and likes, plus reply alerts for followed threads, without exposing the actor's account identity.

## Capabilities and Constraints

- Topics: General, Academics, Campus life, Careers, Mental health, Opportunities.
- Audience per post: Everyone, or My campus only (including explicitly assigned Canteen campus hosts).
- Session-owned browser drafts preserve type, topic, audience, poll and opportunity details until publication succeeds. Successful sign-out/deletion clears drafts; image bytes are not persisted. A reused submission ID prevents duplicate post retries.
- Current team accounts can be assigned specific campuses through `CAMPUS_HOSTS`; `/host` orders waiting questions oldest first and distinguishes no replies from no helpful answer. Host contributions stay labeled and access is rechecked on every request. Waiting totals below five questions are suppressed.
- A private, rate-limited domain correction queue collects a domain and official HTTPS homepage without a requester identity. Human verification and a dataset update are required before eligibility changes.
- Saved posts and followed threads appear in private account collections, limited to content the student can still access. Other students cannot see those collections.
- New opportunity posts require an application link and deadline. Closing-soon sorting is available in discovery and saved opportunities. Closed opportunities leave discovery automatically; accessible threads retain a closed state and a link to the original opportunity. Submissions are from students, not independently vetted listings.
- Images are available when private storage is configured. New uploads require a bounded author-provided description, rendered in feeds, threads and moderation. They are re-encoded in the browser to strip location and camera metadata, then served only to authorized signed-in accounts. Visible image content can still identify someone; legacy public image links remain accessible until migration and erasure finish.
- Students can delete their own posts and comments, and delete their account and related records. Post deletion erases its replies too. Stored images enter a durable erasure queue with retries; providers and backups may retain operational records.
- Three distinct reports hide content pending review. The team records a reason when keeping content, removing it or suspending an author. Authors can review decisions and submit one private appeal per removal or suspension decision; suspended accounts retain access to decisions, appeals, sign-out and deletion, while student feeds and posting are blocked.
- Moderation screens show content and appeals without author or reporter identities. Authorized service operators have database access to account-linked records.
- Team-only campus launch measures show aggregate membership, weekly activity, authors helped and week-two return, suppressing small groups. One account-linked mark per UTC day records activity without page history or text, expires after 90 days and is erased with the account. No external analytics service receives these measures.
- Community guidance explains verification, privacy limits, reporting, deletion and safe sharing. Campus launch prompts use actual campus membership rather than invented adoption claims.
- Display settings let students choose color mode, one of six accents coordinated with the logo, quieter or vivid dark accents, reduced motion, plain or doodle wallpaper, and local timestamp and clock formats. Preferences apply immediately in this browser; they do not sync to the account. Reset changes display settings only.
- Real-name and profile-photo fields remain empty; provider tokens are discarded after sign-in. There are no public profiles or follower counts.
- Publication limiter events contain only account, kind and time, survive content erasure for the quota window, expire after 24 hours through maintenance and are erased with the account. Email sign-in codes have hourly per-address and per-campus budgets keyed without storing the address. Maintenance also expires domain requests after 90 days and exposes its success/failure heartbeat to the team.
- Universities come from a bundled dataset of about 10,000 institutions and their email domains. A campus starts when its first member joins, with cross-campus visibility restricted until five members join.

## Brand Commitments

- The name "Canteen" stays. The founder gave full authority to replace the previous logo and visual identity; nothing from the old look is binding.

## Evidence on Hand

- University dataset: `data/universities.json` (Hipo university-domains-list, MIT licensed).
- Review captures use disposable local fixtures. No independently verified adoption, testimonials, university partnerships or press evidence has been supplied. Never present fixtures as live activity or fabricate social proof, including member counts or university logos.

## Product Principles

1. Protect identity between students: shared discussion responses omit account identity, and per-thread aliases avoid a stable public profile. A student's own account page can show their email; Canteen's stored records remain internally linkable.
2. State verification precisely: sign-in checks university-email control, not current enrollment or the truth of a post.
3. Campus is first class: show campus and audience context while respecting small-campus naming limits.
4. Keep moderation identity-minimal: moderation screens withhold author and reporter identities, while privacy guidance discloses authorized operator access and account-linked records.
5. Honest by default: no invented social proof, no dark patterns, no engagement bait.
