# Campus launch playbook

Launch on one or two campuses where a founder or a real volunteer can spend time answering questions. Keep the wider network available, but direct invitations to the campus experience. Do not manufacture posts, accounts, votes, testimonials or activity counts.

## Before inviting students

- Assign a real owner for each campus and an available moderator. Agree on the hours they can cover; do not promise round-the-clock responses.
- Verify university sign-in, campus isolation, account deletion, private image delivery, moderation and appeal review on the deployment. Configure scheduled maintenance and monitor the oldest overdue deletion job. Finish legacy public-image migration before describing all historical photos as private.
- Publish the community/privacy page and check that its storage and backup statements match the hosting setup. Give previews an isolated database.
- Have hosts use labeled Canteen team accounts, or transparently introduce their role. Do not present paid or staff activity as independent student enthusiasm.

## First two weeks

1. Invite a small group personally, with a direct campus link and a concrete reason to use it: an upcoming course choice, housing question or internship deadline. Ask permission before adding anyone to outreach lists.
2. Ask hosts to share real questions, useful answers and current opportunities with official application links. A founder can post an honest introduction from a team account. Empty states should remain honest until students participate.
3. Check “Needs an answer” during the agreed coverage windows. Answer only where the host has useful knowledge, invite a relevant volunteer with consent, and acknowledge uncertainty. Never mark an answer helpful on the author's behalf.
4. Check reports and appeals daily during the pilot. Review context and choose the reason shown to the author. Keep reporter identities out of support conversations.
5. Ask a few consenting students what stopped them from posting, which answer helped, and what made them return. Keep personal interview notes outside public threads; do not export account-linked discussion histories.

## Weekly decision

Use the team-only `/launch` page. Its primary usefulness measure is distinct question authors who selected a helpful reply in the past seven UTC days. Look alongside weekly active students and week-two return among cohorts whose full observation window has elapsed. Low-volume cells are suppressed, so early qualitative conversations matter. These are operational signals, not causal proof or a promise of growth.

Compare each campus with its own previous weeks. Write down one observation, one change to try, its owner, and when to review it. Fix recurring unanswered needs and moderation delays before inviting another campus. Set expansion targets after a baseline exists; do not invent success numbers before real usage.

## Operational checks

Monitor failed sign-ins, publishing errors, moderation/appeal backlog and the oldest overdue `BlobDeletion`. The daily maintenance endpoint retries ten deletion jobs and migrates one legacy image per invocation; immediate deletion actions also trigger a batch. Drain larger backlogs by invoking the authenticated endpoint repeatedly, or increase the deployment's schedule within its plan limits. Confirm actual erasure in storage before declaring a migration complete. Daily activity retention also depends on maintenance running.

Never put email addresses, account IDs, tokens or post text into analytics dashboards or routine error logs. Database operators still have privileged access to account-linked records; application aliases are not database anonymity. Track service health without exporting student content.
