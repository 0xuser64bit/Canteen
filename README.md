<p align="center">
  <img src="app/icon.svg" width="72" height="72" alt="Canteen logo" />
</p>

<h1 align="center">Canteen</h1>

<p align="center"><strong>Talk like nobody's watching.</strong><br />
University-email sign-in. A different alias in every thread.</p>

---

Canteen is a group chat for university students. Sign-in checks control of a recognized university email address; it does not prove current enrollment. Other students see a per-thread alias instead of your email. Canteen can link account records internally, and what you share can still identify you.

## How anonymity works

Anonymity in Canteen is a property of the data that reaches the browser, not a coat of UI paint.

- **Verified, not identified.** Signing in maps your email domain to a university using the [university-domains-list](https://github.com/Hipo/university-domains-list) dataset. Other students never see your email. Your private account page shows it to you; Canteen leaves real-name and profile-photo fields empty and discards provider tokens after sign-in.
- **A new alias in every thread.** You appear as something like "Quiet Otter" in one thread and "Daring Koala" in the next. Aliases are an HMAC of your user id and the post id, so they're stable inside a thread and unlinkable across threads.
- **Small campuses stay unnamed.** Other universities see your university's name only once at least 5 of its students have joined. Below that, your posts read "A university in India", or just "A university" where a country has fewer than 10 universities.
- **Campus-only posts.** Posts can be limited to your university and explicitly assigned Canteen campus hosts. Other universities cannot load them; moderators can review reported content. Hosts are disabled until an operator assigns them.
- **Shared views omit account identity.** Server code turns discussion rows into view models before rendering; author account IDs and emails never reach other students. Your own private account page can show your email, and stored records remain internally linkable. Integration tests check shared serialized payloads.
- **Photos lose their metadata.** Images are re-encoded in the browser before upload, which strips EXIF data such as GPS coordinates. The server also decodes and re-encodes every upload, so bypassing the composer cannot preserve metadata or spoof image dimensions.
- **Staff are labeled.** Whoever runs a deployment can let their own accounts in with `TEAM_EMAILS`. Those accounts skip the university check, and everything they post says "Canteen team". Removing an address ends that account's access on its next request.
- **Safety without surveillance.** Reports are anonymous. Content that three different students report is hidden automatically. Notifications say that someone replied or liked, never who. Team decisions have reasons, private history and one appeal per decision. Suspended accounts can authenticate only for status, appeal and account deletion; feeds and actions still recheck suspension.
- **Removal and erasure are different.** Team removal hides content while retaining it for review and appeal. Authors can erase their posts or account; database content is removed and image erasure is queued durably. Decision metadata and appeals survive content deletion so an account suspension remains appealable, and are erased with the account. Deleting a suspended account leaves only a keyed hash of its email for 12 months, so the suspension can't be escaped by rejoining.
- **Moderators see content, not people.** Reports land in a queue for team accounts. It shows what was said and the alias it was said under, never an email. Moderators can keep it, remove it, or ban the account, which revokes its sessions and hides everything it wrote. Suspended students can sign in for status, appeal, and deletion only.
- **No contact details.** Text checks catch some phone numbers and email addresses. They cannot catch every identifying detail; check text, links, and visible photo content before posting.

## Features

- Feeds for every university, your own campus, each university, and opportunities, filterable by topic
- Threads with per-thread aliases, OP tags, likes, unique view counts, and replies
- Composer with topics, audience, accessible image descriptions, polls, and session-owned drafts that preserve publishing context until confirmed success
- Polls with two to four choices. Results appear after you vote; only the author and voters see per-choice counts, while everyone else sees the total
- Campus invites: until five classmates join, a share link helps bring the rest in
- Search across posts and universities (<kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd>)
- Paginated notifications that acknowledge only delivered versions, with direct links to replies
- An opt-in, one-time email when a question gets its first reply, without the question or reply text (when email is configured)
- Campus-first navigation, oldest-waiting and no-reply question queues, author-marked helpful answers with direct navigation, and closing-soon saved opportunities
- Explicitly assigned, labeled campus hosts and a private domain-only university correction queue
- Account page with sign-out and full account deletion
- A moderation queue for team accounts, and help links on mental health threads
- Private image uploads when storage is configured, served through authenticated, uncached routes
- Light and dark themes, built mobile-first
- A Kotlin Android app using the same student experience, plus a public [updates page](https://teamcanteen.vercel.app/updates)

## Android app

The `android/` project packages Canteen as a Trusted Web Activity, so mobile web
improvements reach the installed app too. See [Android build, signing and device
checks](docs/ANDROID.md). The production package is `app.canteen.android`;
`public/.well-known/assetlinks.json` binds its release signing certificate to the
site. Keep signing keys outside Git and reuse the same key for updates.

The [improvement roadmap](docs/IMPROVEMENT-ROADMAP.md) records the current work,
validation evidence and the next areas to investigate.

## Tech stack

[Next.js 16](https://nextjs.org) (App Router, React 19, Server Actions) · [Better Auth](https://better-auth.com) (email codes and Google) · [Prisma 7](https://www.prisma.io) on PostgreSQL · [Tailwind CSS 4](https://tailwindcss.com) · [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for images · [Resend](https://resend.com) for email · [Vitest](https://vitest.dev) · [Bun](https://bun.sh)

## Run it locally

You need [Bun](https://bun.sh) 1.4+, Node.js 22.12+, and PostgreSQL 14+ (CI uses PostgreSQL 17).

```sh
git clone https://github.com/0xuser64bit/Canteen.git
cd Canteen
bun install --frozen-lockfile
cp .env.example .env
openssl rand -base64 32
```

Set `DATABASE_URL` in `.env` to an existing local database and paste the generated
value into `BETTER_AUTH_SECRET`. Create the database tables and start the app:

```sh
bun run db:migrate
bun run dev
```

Open <http://localhost:3000> and sign in with any address at a real university
domain, such as `you@stanford.edu`. Without an email provider configured, the
8-digit code is printed in the terminal running `bun run dev`. You can also
configure your own staff address in `TEAM_EMAILS`.

### Configuration

[.env.example](.env.example) is the configuration reference. Only `DATABASE_URL`
and `BETTER_AUTH_SECRET` are needed for local development; optional configuration
enables Google sign-in, Resend email, private Vercel Blob images, staff hosts, and
operational alerts.

| Variable                                   | Required        | Purpose                                                                                                                                         |
| ------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | yes             | PostgreSQL connection string. Use a pooled URL in production.                                                                                   |
| `DATABASE_URL_UNPOOLED`                    | no              | Direct migration connection when `DATABASE_URL` uses a pooler. Use the same database.                                                           |
| `BETTER_AUTH_SECRET`                       | yes             | Signs sessions and derives aliases. `openssl rand -base64 32`. Treat it as persistent data; changing it also changes privacy hashes.            |
| `BETTER_AUTH_URL`                          | no              | Public site URL. Derived automatically on Vercel and in development. Set it for a custom origin.                                                |
| `RESEND_API_KEY`, `EMAIL_FROM`             | no              | Sends sign-in codes by email. Without them, production offers Google sign-in only.                                                              |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no              | "Continue with Google" for accounts with a verified university email. Redirect URI: `<site>/api/auth/callback/google`.                          |
| `BLOB_PRIVATE_READ_WRITE_TOKEN`            | no              | Private Blob store for new uploads.                                                                                                             |
| `BLOB_READ_WRITE_TOKEN`                    | no              | Legacy public store, retained until migration and erasure finish.                                                                               |
| `CRON_SECRET`                              | for maintenance | Protects scheduled image cleanup, migration and activity retention.                                                                             |
| `CAMPUS_HOSTS`                             | no              | JSON map from a current team email to up to ten canonical campus domains. Grants scoped campus discussion access and posting. Empty by default. |
| `TEAM_EMAILS`                              | no              | Comma-separated staff emails that can join without a university email. They post as "Canteen team".                                             |
| `OPS_ALERT_WEBHOOK_URL`                    | for a pilot     | Slack, Discord or other `text` webhook that pages the team about at-risk reports, hidden content, appeals and failed maintenance. Content-free. |

Production sign-in requires Resend or Google credentials. Scheduled maintenance
requires `CRON_SECRET`, including for text-only deployments. See
[operations](docs/OPERATIONS.md) before deploying or changing secrets.

## Checks and tests

```sh
bun run check   # formatting, lint, types, and tests
bun run build   # production build
```

Integration tests exercise the privacy and permission rules against a real
database. Point them at a disposable, migrated **native PostgreSQL** database:

```sh
createdb canteen_test
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/canteen_test
DATABASE_URL="$TEST_DATABASE_URL" DATABASE_URL_UNPOOLED="$TEST_DATABASE_URL" bun run db:deploy
bun run test
```

Use your own Postgres credentials. The suite truncates its database. Setting both
migration URLs above ensures a direct connection configured in `.env` cannot send
test migrations to another database. Database tests are skipped unless
`TEST_DATABASE_URL` is set.

The database suite covers authentication endpoints, campus visibility, serialized
identity protection, concurrent posting limits, moderation rollback, notifications,
polls, account deletion, and image metadata and cleanup failures. Email and Blob
requests are mocked; tests never send mail or upload files.

CI runs all of this, plus a production dependency audit and build, on pushes to
`main` and pull requests. The remaining development dependency advisory is tracked
in [SECURITY.md](SECURITY.md#dependency-review).

## Deploy

Canteen deploys to [Vercel](https://vercel.com) as-is. `vercel.json` installs with
Bun and runs `scripts/vercel-build.sh`, which applies pending migrations on
production deploys only. Add a Postgres database (for example Neon from the Vercel
Marketplace), set the variables above, and deploy. Give preview deployments their
own database so pull requests never migrate production. Provision and migrate it
explicitly before the first preview build; the build script intentionally skips
preview migrations.

[Operations](docs/OPERATIONS.md) is the runbook for deployment, isolated previews,
migrations, maintenance and monitoring, staff access, image migration and erasure,
and retention.

### Current operational limits

- **Private images require configuration.** Create a private Blob store and set `BLOB_PRIVATE_READ_WRITE_TOKEN` and `CRON_SECRET`. Images are streamed through authenticated, uncached routes. Keep the old public-store token while legacy files migrate: maintenance copies one image, atomically swaps its reference, and queues erasure of the public original. Already-shared public URLs remain accessible until erasure completes.
- **Cleanup is durable but asynchronous.** Upload intents exist before storage writes; deletion jobs commit with post/account removal. Workers lease jobs and retry failures with backoff. `vercel.json` runs maintenance daily ([Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)); deletion actions also attempt immediate cleanup. On other hosts, schedule `GET /api/maintenance` with `Authorization: Bearer <CRON_SECRET>`. Each run drains up to four batches of ten deletion jobs within a bounded time budget and migrates one legacy image. Invoke repeatedly to drain larger backlogs. The team-only `/launch` page shows last success/failure, overdue jobs, retries, and the age of waiting reports and appeals; set `OPS_ALERT_WEBHOOK_URL` so failures and urgent reports page the team instead of waiting for someone to look, and point an uptime monitor at the public, content-free `/api/health`, which answers 503 once maintenance is more than 26 hours stale.
- **Live threads use polling.** Visible, online threads check their revision every ten seconds and back off on failure. Replies use URL-backed pages of 50, so refresh revalidates the current reading range. Earlier/latest navigation and notification/helpful-answer links preserve a specific reading page. Move to push delivery if concurrent open threads make polling costly. Notifications commit with the reply or like; saves and follows are private account data.

## Campus launch

Start with one or two campuses using [the launch playbook](LAUNCH.md). The
team-only `/launch` page measures weekly active students, students who received
author-marked helpful answers, and observed week-two return. Counts under five and
small rate groups are suppressed. A single UTC daily activity mark is stored
internally, expires after 90 days through maintenance, and cascades on account
deletion. No page history, text, or email is sent to external analytics.

The public `/community` page explains verification limits, internal account
linkage, photo risks, moderation, appeals, retention and erasure. This is product
guidance; review hosting/backups and organizational policies for the actual
deployment.

## Project layout

| Path                     | Responsibility                                                         |
| ------------------------ | ---------------------------------------------------------------------- |
| `app/`                   | Pages, layouts, auth and operational HTTP routes                       |
| `components/`            | Interactive UI and shared `ui/` primitives                             |
| `lib/`                   | Authentication, sessions, validation, aliases, and university matching |
| `server/`                | Authorized read models, mutations, media, metrics, and operations      |
| `prisma/`                | Database schema and committed migrations                               |
| `data/universities.json` | University email-domain dataset                                        |
| `test/`                  | Interaction tests; other tests live beside their modules               |
| `android/`               | Kotlin Trusted Web Activity and its Gradle wrapper                     |

Prisma's client is generated during installation; generated clients and build
output stay out of Git.

## Product and design notes

- [DESIGN.md](DESIGN.md) records the visual system, tokens, surfaces and UI rules.
- [PRODUCT.md](PRODUCT.md) describes users, positioning, capabilities and product principles.
- [Improvement roadmap](docs/IMPROVEMENT-ROADMAP.md) and [the 23 October audit](docs/IMPROVEMENT-AUDIT-2026-10-23.md) record completed work and open investigations.
- [Launch playbook](LAUNCH.md) covers the first weeks on a campus and the weekly decision.

## Contributing

Bug reports, ideas, and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, especially the privacy rules. If your university is missing, use `/university-request` with its domain and official homepage. Do not put a personal email address in a public issue.

Found a way to unmask someone or reach data you shouldn't? Please report it privately; see [SECURITY.md](SECURITY.md).

## Credits

- University domains: [Hipo/university-domains-list](https://github.com/Hipo/university-domains-list) (MIT)
- Icons: [Lucide](https://lucide.dev) (ISC)
- Typeface: [Mona Sans](https://github.com/github/mona-sans) (SIL Open Font License)

## License

[MIT](LICENSE)
