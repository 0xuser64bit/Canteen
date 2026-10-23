# Deployment and operations

For deployment owners and moderators. Local setup and checks are in the
[README](../README.md); configuration names and defaults are in
[.env.example](../.env.example). The public `/community` page explains the
student-facing privacy and moderation model. Review its hosting and backup
statements against the actual deployment.

## Deploy safely

1. Provision PostgreSQL and configure `DATABASE_URL`. When using a connection
   pooler, also set `DATABASE_URL_UNPOOLED` to a direct connection to the **same
   database**. Prisma migrations prefer the direct URL.
2. Generate and securely retain `BETTER_AUTH_SECRET`. It signs sessions and
   derives thread aliases, draft ownership, view markers, sign-in budgets and
   suspension hashes. Keep it stable: changing it requires an explicit migration
   and recovery plan, rather than routine credential rotation.
3. Configure a working sign-in method. Production email codes require
   `RESEND_API_KEY` and a suitable `EMAIL_FROM`; Google requires both OAuth
   variables and `<site>/api/auth/callback/google` as its redirect URI. Without a
   mail provider, production disables email-code sign-in. Development prints
   codes to the local server console.
4. Give previews an isolated database, private test Blob store and appropriately
   scoped authentication and email configuration. Never connect a preview to
   production data. Preview builds skip migrations; migrate their database
   explicitly before building:

   ```sh
   DATABASE_URL="$PREVIEW_DATABASE_URL" DATABASE_URL_UNPOOLED="$PREVIEW_DATABASE_URL" bun run db:deploy
   ```

5. Run `bun run check` and the database suite described in the README before
   deploying. The integration suite **truncates its database**: use disposable
   native PostgreSQL, never a shared development or production database. Real
   multi-connection PostgreSQL is needed to exercise locking behavior; email
   and Blob delivery are mocked.
6. Review migrations before production deployment. Back up or branch the
   database through its provider before destructive changes, and assess lock
   and write costs on realistic row counts.

[vercel.json](../vercel.json) installs with the frozen Bun lockfile and runs
`scripts/vercel-build.sh`. That script applies pending migrations when
`VERCEL_ENV=production`, then builds the app. On another host, apply
`bun run db:deploy` before starting the new application version. CI checks and
hosting deployments are separate; the repository does not make deployment wait
for CI. Configure release protection in the hosting/Git settings as needed.

Before inviting students, verify university sign-in, campus isolation, account
deletion, private image access, moderation and appeals on the deployment. Assign
a real moderator and response coverage; Canteen promises no guaranteed response
time. Test production mail delivery separately from the mocked test suite.

Plan the launch itself with the [campus launch playbook](../LAUNCH.md): it covers
the first two weeks, the weekly decision, honest outreach and the operational
checks that matter during a pilot.

## Staff and campus access

- `TEAM_EMAILS` is the current staff allowlist. Staff contributions are labeled
  “Canteen team”; removing an address ends that team account's access on its next
  request, including existing sessions.
- Staff status alone does not grant campus discussion access. A host must belong
  to the Canteen team university, remain in `TEAM_EMAILS`, and have explicit
  `CAMPUS_HOSTS` assignments using canonical primary domains from
  `data/universities.json`. Leave assignments empty until owners accept the
  disclosed access model. Removing an assignment revokes that campus's normal
  reads, posts and reply alerts on the next request.
- Moderators can review reported content, including campus-only content, without
  receiving author or reporter identity in the moderation interface. Database
  operators still have privileged access to account-linked records; aliases do
  not make the database anonymous.
- Review domain correction requests in `/launch`. Independently verify the
  institution and official domain, update and test `data/universities.json`,
  deploy, then resolve the request. A submission never changes eligibility by
  itself. Do not export account-linked histories or send unsolicited follow-ups.

## Maintenance and alerts

Set `CRON_SECRET`. The checked-in Vercel schedule calls `GET /api/maintenance`
daily at **04:00 UTC**. Other hosts must schedule the same request with
`Authorization: Bearer <CRON_SECRET>`. Missing or incorrect credentials return 401. To run it manually with the secret already set in your shell:

```sh
curl --fail-with-body -H "Authorization: Bearer $CRON_SECRET" https://YOUR_CANTEEN_DOMAIN/api/maintenance
```

Each invocation retries up to four batches of ten due image-deletion jobs within
its time budget, migrates one legacy image, and removes expired retention rows.
Post/account deletion also attempts immediate image cleanup. Workers lease jobs
for five minutes and retry storage failures with backoff. Repeat authenticated
invocations to drain large backlogs, or use a more frequent supported schedule.

The staff-only `/launch` page shows maintenance heartbeat timestamps, overdue
image jobs, retries, oldest unresolved reports/appeals, domain requests and
aggregate campus activity. Investigate growing overdue work even when the last
maintenance run succeeded: individual storage failures are retried internally.

Set `OPS_ALERT_WEBHOOK_URL` to an operational owner's Slack, Discord or compatible
webhook. At-risk reports, report-hidden content, new appeals and failed
maintenance runs trigger alerts. Test delivery. Messages identify the type of
attention needed and link to `/mod` or `/launch`; they contain no discussion
content, aliases, emails or account IDs. Failed webhook delivery is logged
generically and does not guarantee someone has been paged.

Use an external monitor for `/api/health`: it returns 200 only when maintenance
has succeeded within 26 hours, and 503 for missing or stale success. Treat any
non-200 response as unhealthy, including database failures. A maintenance run
that never starts cannot send its own failure alert. Review reports and appeals
regularly even when alerts are configured.

## Images and erasure

New uploads require `BLOB_PRIVATE_READ_WRITE_TOKEN`. Images are decoded and
re-encoded server-side to strip metadata, then delivered through authenticated,
uncached `/api/images/[id]` requests. Visible faces, screenshots and text can
still identify someone.

Upload cleanup intents exist before storage writes; post/account deletion
commits durable image-deletion work with database erasure. Storage outages leave
retryable jobs rather than silently losing erasure requests. Abandoned uploads
become due after an hour and wait for a worker.

For legacy public files, retain `BLOB_READ_WRITE_TOKEN` alongside the private
token. Maintenance copies and re-encodes one image, atomically swaps its post
reference and queues deletion of the public original. Old public links remain
accessible until actual erasure. Do not declare historical photos private or
erased from an HTTP success alone: confirm object state with the provider and
drain outstanding deletion work before removing the legacy token.

## Retention and recovery

Successful maintenance removes records older than the following windows.
Cleanup waits for a scheduled run; interrupted schedules extend retention.

| Records                                                       | Cleanup threshold                         |
| ------------------------------------------------------------- | ----------------------------------------- |
| Account-linked UTC daily activity; domain correction requests | 90 days                                   |
| Publication quotas; separate auth network rate-limit records  | 24 hours                                  |
| Hashed-address/campus sign-in budgets                         | One hour                                  |
| Sessions and sign-in codes                                    | Their expiration timestamp                |
| Hash blocking rejoining after a suspended account is erased   | Its expiration timestamp, set to 365 days |

Account deletion erases related records; images remain queued until storage
erasure succeeds. Hosting providers, backups and identity providers may retain
their own operational records. Keep email addresses, account IDs, IPs, tokens
and discussion text out of routine logs, alerts and analytics exports. Aggregate
campus metrics stay inside Canteen and suppress small groups.

For rollback, revert application code while retaining additive tables and
columns until compatibility is assessed. Preserve deletion intents and provider
token erasure. Diagnose failed migrations before changing Prisma migration
history; **never reset a production database**. Use the provider's backup and
restore procedures, and verify recovered data and pending erasure work before
reopening access.
