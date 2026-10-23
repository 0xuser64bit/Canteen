# Canteen

Campus-first conversations behind per-thread aliases. Students sign in with a
recognized university email address, ask questions, and talk with their campus or
the wider university network.

Sign-in verifies control of an email address, not current enrollment. Other
students see an alias instead of an account identity; Canteen's stored records
remain internally linkable, and shared text or photos can still identify someone.

## What it does

- Campus and cross-university feeds, topic filters, search, and question queues
- Threads with a different alias per conversation, replies, likes, polls, and
  author-marked helpful answers
- Opportunities with application links and deadlines; private saves, followed
  threads, notifications, and optional first-reply email
- Campus-only audiences, explicitly assigned staff hosts, reporting, moderation,
  appeals, and account deletion
- Private image uploads when storage is configured, session-owned browser drafts,
  local display preferences, and an Android Trusted Web Activity

There are no public profiles or cross-thread author histories. Small campuses
remain unnamed outside their campus until at least five members join. Poll
authors and voters can see per-choice results; other readers see the total only.
The public `/community` page explains privacy, moderation, and erasure to students;
`/updates` records shipped product changes.

## Run locally

Install Bun 1.4+, Node.js 22.12+, and PostgreSQL (CI uses PostgreSQL 17).

```sh
bun install --frozen-lockfile
cp .env.example .env
openssl rand -base64 32
```

Set `DATABASE_URL` in `.env` to an existing local database and paste the generated
value into `BETTER_AUTH_SECRET`. Then:

```sh
bun run db:migrate
bun run dev
```

Open <http://localhost:3000>. Without an email provider, development prints
eight-digit sign-in codes in the server console. Use a recognized university
domain, or configure your own staff address in `TEAM_EMAILS`.

[.env.example](.env.example) is the configuration reference. Only `DATABASE_URL`
and `BETTER_AUTH_SECRET` are needed for local development. Optional configuration
enables Google sign-in, Resend email, private Vercel Blob images, staff hosts, and
operational alerts. `DATABASE_URL_UNPOOLED` supplies a direct migration connection
when the runtime URL uses a pooler. Set `BETTER_AUTH_URL` for a custom origin.

Production sign-in requires Resend or Google credentials. Scheduled maintenance
requires `CRON_SECRET`, including for text-only deployments. Treat
`BETTER_AUTH_SECRET` as persistent data: it also derives aliases and privacy
hashes. See [operations](docs/OPERATIONS.md) before deploying or changing secrets.

## Development and checks

```sh
bun run check   # formatting, lint, types, and tests
bun run build   # production build
```

Database tests are skipped unless `TEST_DATABASE_URL` is set. They **truncate
their database**; use the disposable PostgreSQL setup in
[Contributing](CONTRIBUTING.md#checks). Email and Blob delivery are mocked in that
suite. CI runs the full database suite, production dependency audit, and build on
pushes to `main` and pull requests.

The stack is Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Better
Auth, Prisma 7, PostgreSQL, and Vitest. Prisma's client is generated during
installation; generated clients and build output stay out of Git.

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

## Deploy and maintain

[Operations](docs/OPERATIONS.md) covers Vercel configuration, isolated previews,
migrations, scheduled retention and image erasure, monitoring, and staff access.
`vercel.json` uses Bun and applies migrations before production builds; previews
require their own explicitly migrated database.

[Android](docs/ANDROID.md) covers local builds, release signing, and domain
verification. It shares the hosted web experience and browser-owned sign-in.

Read [Contributing](CONTRIBUTING.md) for privacy boundaries and UI conventions.
Report vulnerabilities privately using [the security policy](SECURITY.md).
Missing universities can be submitted at `/university-request` with their domain
and official homepage; never include a personal email in a public issue.

## License and credits

[MIT](LICENSE). University domains come from
[Hipo/university-domains-list](https://github.com/Hipo/university-domains-list)
(MIT). Icons are [Lucide](https://lucide.dev) (ISC); the typeface is
[Mona Sans](https://github.com/github/mona-sans) (SIL Open Font License).
