<p align="center">
  <img src="app/icon.svg" width="72" height="72" alt="Canteen logo" />
</p>

<h1 align="center">Canteen</h1>

<p align="center"><strong>Talk like nobody's watching.</strong><br />
Anonymous conversations between verified university students.</p>

---

Canteen is a group chat for university students. Your university email (or your university's Google account) proves you're a student. After that, nobody, including other students, ever sees who you are.

## How anonymity works

Anonymity in Canteen is a property of the data that reaches the browser, not a coat of UI paint.

- **Verified, not identified.** Signing in maps your email domain to a university using the [university-domains-list](https://github.com/Hipo/university-domains-list) dataset. Your email is never shown anywhere, and Canteen never stores real names or profile photos.
- **A new alias in every thread.** You appear as something like "Quiet Otter" in one thread and "Daring Koala" in the next. Aliases are an HMAC of your user id and the post id, so they're stable inside a thread and unlinkable across threads.
- **Small campuses stay unnamed.** Other universities see your university's name only once at least 5 of its students have joined. Below that, your posts read "A university in India".
- **Campus-only posts.** Posts can be limited to students of your own university. Other universities can't load them at all.
- **No identity on the wire.** Server code turns database rows into view models before anything is rendered; author ids and emails never leave the server. Integration tests check the serialized payloads.
- **Photos lose their metadata.** Images are re-encoded in the browser before upload, which strips EXIF data such as GPS coordinates. The server also decodes and re-encodes every upload, so bypassing the composer cannot preserve metadata or spoof image dimensions.
- **Staff are labeled.** Whoever runs a deployment can let their own accounts in with `TEAM_EMAILS`. Those accounts skip the university check, and everything they post says "Canteen team".
- **Safety without surveillance.** Reports are anonymous. Content that three different students report is hidden automatically. Notifications say that someone replied or liked, never who.
- **Moderators see content, not people.** Reports land in a queue for team accounts. It shows what was said and the alias it was said under, never an email. Moderators can keep it, remove it, or ban the account, which signs it out for good and hides everything it wrote.
- **No contact details.** Posts and replies can't carry phone numbers or email addresses, so nobody gets doxxed in a thread.

## Features

- Feeds for every university, your own campus, each university, and opportunities, filterable by topic
- Threads with per-thread aliases, OP tags, likes, unique view counts, and replies
- Composer with topics, audience (everyone or campus-only), images, polls, and saved drafts
- Polls with two to four choices. Results appear once you vote, and only totals ever leave the server
- Campus invites: until five classmates join, a share link helps bring the rest in
- Search across posts and universities (<kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd>)
- Notifications for replies and likes
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

Open http://localhost:3000 and sign in with any address at a real university domain, such as `you@stanford.edu`. Without an email provider configured, the 6-digit code is printed in the terminal running `bun run dev`.

### Configuration

| Variable                                   | Required   | Purpose                                                                                                                |
| ------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | yes        | PostgreSQL connection string. Use a pooled URL in production.                                                          |
| `BETTER_AUTH_SECRET`                       | yes        | Signs sessions and derives aliases. `openssl rand -base64 32`.                                                         |
| `BETTER_AUTH_URL`                          | no         | Public site URL. Derived automatically on Vercel and in development.                                                   |
| `RESEND_API_KEY`, `EMAIL_FROM`             | no         | Sends sign-in codes by email. Without them, production offers Google sign-in only.                                     |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no         | "Continue with Google" for accounts with a verified university email. Redirect URI: `<site>/api/auth/callback/google`. |
| `BLOB_PRIVATE_READ_WRITE_TOKEN`            | no         | Private Blob store for new uploads.                                                                                    |
| `BLOB_READ_WRITE_TOKEN`                    | no         | Legacy public store, retained until migration and erasure finish.                                                      |
| `CRON_SECRET`                              | for images | Secret for scheduled image migration and deletion retries.                                                             |
| `TEAM_EMAILS`                              | no         | Comma-separated staff emails that can join without a university email. They post as "Canteen team".                    |

## Checks and tests

```sh
bun run check   # format, lint, typecheck, unit tests
```

Integration tests exercise the privacy and permission rules against a real database. Point them at a disposable, migrated database:

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

Canteen deploys to [Vercel](https://vercel.com) as-is. `vercel.json` installs with Bun and runs `scripts/vercel-build.sh`, which applies pending migrations on production deploys only. Add a Postgres database (for example Neon from the Vercel Marketplace), set the variables above, and deploy. Give preview deployments their own database so pull requests never migrate production.

### Current operational limits

- **Private images require configuration.** Create a private Blob store and set `BLOB_PRIVATE_READ_WRITE_TOKEN` and `CRON_SECRET`. Images are streamed through authenticated, uncached routes. Keep the old public-store token while legacy files migrate: maintenance copies one image, atomically swaps its reference, and queues erasure of the public original. Already-shared public URLs remain accessible until erasure completes.
- **Cleanup is durable but asynchronous.** Upload intents exist before storage writes; deletion jobs commit with post/account removal. Workers lease jobs and retry failures with backoff. `vercel.json` runs maintenance daily ([Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)); deletion actions also attempt immediate cleanup. On other hosts, schedule `GET /api/maintenance` with `Authorization: Bearer <CRON_SECRET>`. Invoke repeatedly to clear migration/deletion backlogs; monitor `BlobDeletion` oldest due date and attempts. No credentials or files are migrated by installing code alone.
- **Long threads need pagination.** A thread currently reads its first 1,000 replies. Add pagination before using Canteen for threads that can exceed that limit.

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

Bug reports, ideas, and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, especially the privacy rules. If your university is missing, open an issue with its name and email domain.

Found a way to unmask someone or reach data you shouldn't? Please report it privately; see [SECURITY.md](SECURITY.md).

## Credits

- University domains: [Hipo/university-domains-list](https://github.com/Hipo/university-domains-list) (MIT)
- Icons: [Lucide](https://lucide.dev) (ISC)
- Typeface: [Mona Sans](https://github.com/github/mona-sans) (SIL Open Font License)

## License

[MIT](LICENSE)
