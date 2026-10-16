# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University students anywhere in the world. Sign-in verifies control of a recognized university email address; it does not independently establish current enrollment. They mostly arrive on phones, in short sessions between classes or late at night, to ask something they would not ask under their own name, or to read what students at their own and other universities honestly think.

## Product Purpose

Canteen is an anonymous discussion space for verified university students. It makes candid conversation possible about academics, campus life, careers, mental health, and opportunities, without the risk of being identified by classmates, professors, or future employers. Success means students trust it enough to ask the real question, and the answers they get are from real students.

## Positioning

Verified, not identified. A neighboring forum can be anonymous or verified, rarely both. On Canteen every account is tied to a real university, but posts reveal only the university and a per-thread alias (for example "Quiet Otter"), so a student's activity cannot be linked across threads. Campus-only posts let students talk with people from their own university without the wider network listening.

## Operating Context

- Sign in with a university email address via a 6-digit code (no passwords), or with a university Google Workspace account. Production currently launches with Google sign-in only; email codes switch on once an email provider key is configured.
- Main loops: read the feed, filter by topic, open a thread, reply, like; write a post (title, body, topic, audience, optional image).
- Feeds: Everyone (all universities), My campus (own university, including campus-only posts), Opportunities (internships, jobs, hackathons, scholarships), and a page per university.
- Notifications tell authors when their post gets replies or likes, never who acted.

## Capabilities and Constraints

- Topics: General, Academics, Campus life, Careers, Mental health, Opportunities.
- Audience per post: Everyone, or My campus only.
- Images are re-encoded in the browser before upload so location metadata never leaves the device.
- Students can delete their own posts and comments, and delete their account with all their content.
- Reporting hides content after enough distinct students flag it.
- No real names, profile photos, follower counts, or public profiles exist anywhere in the product.
- Universities come from a bundled dataset of about 10,000 institutions and their email domains; a university appears in the product once its first student joins.

## Brand Commitments

- The name "Canteen" stays. The founder gave full authority to replace the previous logo and visual identity; nothing from the old look is binding.

## Evidence on Hand

- University dataset: `data/universities.json` (Hipo university-domains-list, MIT licensed).
- There are no users, testimonials, metrics, partner universities, or press yet. Never fabricate any of them, including member counts or university logos.

## Product Principles

1. Anonymity is structural, not cosmetic: identity never reaches the client, so no UI choice can leak it.
2. Verified, not identified: trust comes from the university check, never from personal profiles.
3. Campus is first class: every surface makes clear which university a voice comes from and who can see a post.
4. Safety without surveillance: reporting and hiding work without anyone, including moderators, learning who wrote what.
5. Honest by default: no invented social proof, no dark patterns, no engagement bait.
