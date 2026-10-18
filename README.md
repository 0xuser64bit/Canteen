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
- **Small campuses stay unnamed.** Other universities see your university's name only once at least 5 of its students have joined. Below that, your posts read "A university in India".
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
- Polls with two to four choices. Results appear once you vote, and only totals ever leave the server
- Campus invites: until five classmates join, a share link helps bring the rest in
- Search across posts and universities (<kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd>)
- Paginated notifications that acknowledge only delivered versions, with direct links to replies
- Campus-first navigation, oldest-waiting and no-reply question queues, author-marked helpful answers with direct navigation, and closing-soon saved opportunities
- Explicitly assigned, labeled campus hosts and a private domain-only university correction queue
- Account page with sign-out and full account deletion
- A moderation queue for team accounts, and help links on mental health threads
- Light and dark themes, built mobile-first

## Tech stack

[Next.js 16](https://nextjs.org) (App Router, React 19, Server Actions) · [Better Auth](https://better-auth.com) (email codes and Google) · [Prisma 7](https://www.prisma.io) on PostgreSQL · [Tailwind CSS 4](https://tailwindcss.com) · [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for images · [Resend](https://resend.com) for email · [Vitest](https://vitest.dev) · [Bun](https://bun.sh)

## Run it locally

You need [Bun](https://bun.sh) 1.4+, Node.js 22.12+, and PostgreSQL 14+.

```sh
git clone https://github.com/0xuser64bit/Canteen.git
cd Canteen
bun install
cp .env.example .env
```

Fill in `.env`:

```sh
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/canteen"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"   # paste the generated value
```

Create the database tables and start the app:

```sh
bun run db:migrate
bun run dev
```

Open http://localhost:3000 and sign in with any address at a real university domain, such as `you@stanford.edu`. Without an email provider configured, the 8-digit code is printed in the terminal running `bun run dev`.

### Configuration

| Variable                                   | Required        | Purpose                                                                                                                                         |
| ------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | yes             | PostgreSQL connection string. Use a pooled URL in production.                                                                                   |
| `BETTER_AUTH_SECRET`                       | yes             | Signs sessions and derives aliases. `openssl rand -base64 32`.                                                                                  |
| `BETTER_AUTH_URL`                          | no              | Public site URL. Derived automatically on Vercel and in development.                                                                            |
| `RESEND_API_KEY`, `EMAIL_FROM`             | no              | Sends sign-in codes by email. Without them, production offers Google sign-in only.                                                              |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no              | "Continue with Google" for accounts with a verified university email. Redirect URI: `<site>/api/auth/callback/google`.                          |
| `BLOB_PRIVATE_READ_WRITE_TOKEN`            | no              | Private Blob store for new uploads.                                                                                                             |
| `BLOB_READ_WRITE_TOKEN`                    | no              | Legacy public store, retained until migration and erasure finish.                                                                               |
| `CRON_SECRET`                              | for maintenance | Protects scheduled image cleanup, migration and activity retention.                                                                             |
| `CAMPUS_HOSTS`                             | no              | JSON map from a current team email to up to ten canonical campus domains. Grants scoped campus discussion access and posting. Empty by default. |
| `TEAM_EMAILS`                              | no              | Comma-separated staff emails that can join without a university email. They post as "Canteen team".                                             |

## Checks and tests

```sh
bun run check   # format, lint, typecheck, unit tests
```

Integration tests exercise the privacy and permission rules against a real database. Point them at a disposable, migrated **native PostgreSQL** database:

```sh
createdb canteen_test
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/canteen_test
DATABASE_URL="$TEST_DATABASE_URL" DATABASE_URL_UNPOOLED="$TEST_DATABASE_URL" bunx prisma migrate deploy
bun run test
```

Use your own Postgres credentials. The suite truncates its database. Setting both migration URLs above ensures a direct connection configured in `.env` cannot send test migrations to another database.

The database suite covers authentication endpoints, campus visibility, serialized identity protection, concurrent posting limits, moderation rollback, notifications, polls, account deletion, and image metadata and cleanup failures. Email and Blob requests are mocked; tests never send mail or upload files.

CI runs all of this, plus a production dependency audit and build, on every push and pull request. The remaining development dependency advisory is tracked in [SECURITY.md](SECURITY.md#dependency-review).

## Deploy

Canteen deploys to [Vercel](https://vercel.com) as-is. `vercel.json` installs with Bun and runs `scripts/vercel-build.sh`, which applies pending migrations on production deploys only. Add a Postgres database (for example Neon from the Vercel Marketplace), set the variables above, and deploy. Give preview deployments their own database so pull requests never migrate production. Provision and migrate it explicitly before the first preview build; the build script intentionally skips preview migrations. See the exact deployment sequence in [LAUNCH.md](LAUNCH.md#deployment-and-migration-sequence).

### Current operational limits

- **Private images require configuration.** Create a private Blob store and set `BLOB_PRIVATE_READ_WRITE_TOKEN` and `CRON_SECRET`. Images are streamed through authenticated, uncached routes. Keep the old public-store token while legacy files migrate: maintenance copies one image, atomically swaps its reference, and queues erasure of the public original. Already-shared public URLs remain accessible until erasure completes.
- **Cleanup is durable but asynchronous.** Upload intents exist before storage writes; deletion jobs commit with post/account removal. Workers lease jobs and retry failures with backoff. `vercel.json` runs maintenance daily ([Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)); deletion actions also attempt immediate cleanup. On other hosts, schedule `GET /api/maintenance` with `Authorization: Bearer <CRON_SECRET>`. Each run drains up to four batches of ten deletion jobs within a bounded time budget and migrates one legacy image. Invoke repeatedly to drain larger backlogs. The team-only `/launch` page shows last success/failure, overdue jobs, retries, and the age of waiting reports and appeals; it is a status page, not an external alerting service. No credentials or files are migrated by installing code alone.
- **Live threads use polling.** Visible, online threads check their revision every ten seconds and back off on failure. Replies use URL-backed pages of 50, so refresh revalidates the current reading range. Earlier/latest navigation and notification/helpful-answer links preserve a specific reading page. Move to push delivery if concurrent open threads make polling costly. Notifications commit with the reply or like; saves and follows are private account data.

### Retention and migration notes

- Post, reply and image-attempt quotas use publication events independent of surviving content. These contain account ID, kind and time, expire after 24 hours through maintenance, and cascade on account deletion. Deleted text is never retained for quota enforcement.
- Email sign-in codes have hourly budgets per address and per campus, for both sending and guessing, independent of IP addresses and code lockouts. Counters are keyed by a keyed hash of the address or by campus domain and are removed by maintenance once their hour passes. A code that can't be delivered is erased, and the student is told nothing was sent. Without an email provider, production refuses both email-code endpoints.
- Provider access, refresh and ID tokens are discarded by account create/update hooks. The token-minimization migration clears existing values; account/provider bindings remain intact.
- Sessions store no IP address or user agent: a session hook discards them and a migration cleared existing values. Better Auth's rate limiter still keys short-lived `RateLimit` rows by network address, apart from accounts; maintenance deletes them within a day, along with expired sessions and sign-in codes.
- Drafts live only in this browser, scoped to an opaque authenticated session and optional host campus. New sessions cannot adopt old drafts; successful sign-out/deletion clears them. Image bytes are not saved. Browser storage is readable by someone with direct device access.
- University correction requests contain a domain and HTTPS homepage, without requester email or IP address. They are deduplicated, share a global budget of 100 submissions per 24-hour window, and expire after 90 days through maintenance. Review never changes eligibility automatically; verified dataset changes must ship first.

## Campus launch

Start with one or two campuses using [the launch playbook](LAUNCH.md). The team-only `/launch` page measures weekly active students, students who received author-marked helpful answers, and observed week-two return. Counts under five and small rate groups are suppressed. A single UTC daily activity mark is stored internally, expires after 90 days through maintenance, and cascades on account deletion. No page history, text, or email is sent to external analytics. Keep scheduled maintenance enabled even for text-only deployments.

The public `/community` page explains verification limits, internal account linkage, photo risks, moderation, appeals, retention and erasure. This is product guidance; review hosting/backups and organizational policies for the actual deployment.

## Project layout

```text
app/            routes: (marketing) landing, (auth) sign-in, (app) the product
components/     UI, including components/ui primitives
lib/            auth, database client, aliases, validation, university matching
server/         queries.ts (reads) and actions.ts (writes): every rule lives here
prisma/         schema and migrations
data/           university domain dataset
```

## Contributing

Bug reports, ideas, and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, especially the privacy rules. If your university is missing, use `/university-request` with its domain and official homepage. Do not put a personal email address in a public issue.

Found a way to unmask someone or reach data you shouldn't? Please report it privately; see [SECURITY.md](SECURITY.md).

## Credits

- University domains: [Hipo/university-domains-list](https://github.com/Hipo/university-domains-list) (MIT)
- Icons: [Lucide](https://lucide.dev) (ISC)
- Typeface: [Mona Sans](https://github.com/github/mona-sans) (SIL Open Font License)

## License

[MIT](LICENSE)
