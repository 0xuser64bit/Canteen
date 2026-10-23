# Contributing

Use the [README](README.md#run-locally) for setup and
[operations guide](docs/OPERATIONS.md) for deployment. Keep changes focused, use
existing helpers and dependencies, and describe the behavior and checks in each
pull request. Commit messages follow Conventional Commits (`fix:`, `feat:`,
`chore:`, etc.).

## Privacy boundaries

- Shared discussion responses must omit author and reporter account IDs, emails,
  raw database rows, and session credentials. Convert rows to explicit view models
  in `server/queries.ts`. A private account page may show its owner their email;
  browser drafts use an opaque session-derived owner, never a session ID.
- Reuse `visibleTo(viewer)` for discussion access. Derive identity from
  `getViewer()` and recheck suspension, current team membership, and host
  assignments. A client-supplied campus is a request, not authorization; team
  membership alone does not grant campus access. Preserve restricted suspended
  account access for status, appeals, and erasure.
- Validate untrusted input with the existing boundary schemas. Keep private
  image delivery authorized and uncached; preserve server-side image re-encoding
  and durable erasure work when changing upload or deletion flows.
- Never log discussion text, emails, tokens, IP addresses, or account-linked
  content. Do not add public profiles, author histories, or counters that link a
  student's aliases across threads.
- Describe verification as university-email control, not proof of enrollment or
  post accuracy. Label examples and staff activity honestly; never fabricate
  members, activity, testimonials, or partnerships.

## Code and interface conventions

Use strict TypeScript and existing patterns. Main reads and mutations live in
`server/queries.ts` and `server/actions.ts`, with supporting server modules and
`lib/` helpers. Schema changes need a committed migration:

```sh
bun run db:migrate --name describe_the_change
```

`app/globals.css` owns design tokens; `components/ui/` owns shared controls.
Reuse these rather than copying token tables or creating a second component
system. [DESIGN.md](DESIGN.md) documents the full visual system. Own messages sit
on the right using `you-surface` and matching inks; others sit on the left in
neutral bubbles, with alias hues from `components/alias.tsx`. The selected accent
carries primary actions and the logo; yellow is the default, not a fixed palette.
Use Mona Sans's expanded cut for display text only.

Keep controls usable on narrow screens, with visible keyboard focus, labels,
readable input text, and adequate touch targets. Check light/dark and Soft/Vivid
accents, text scaling, and both device and local reduced-motion preferences.
Preserve drafts through failed requests and clear them only after confirmed
publication; never persist image bytes or adopt drafts from another session.

## Checks

Before a pull request, run `bun run check` and `bun run build`. Changes to
authorization, server behavior, or schema also need the database suite.

**The integration suite truncates its database before each test.** Use an existing
disposable native PostgreSQL database, never a development database you need or a
shared/production database. For example, create a dedicated database and replace
the credentials below with your local credentials:

```sh
createdb canteen_test
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/canteen_test
DATABASE_URL="$TEST_DATABASE_URL" DATABASE_URL_UNPOOLED="$TEST_DATABASE_URL" bun run db:deploy
bun run check
```

Both migration URLs must name that same disposable database: Prisma prefers
`DATABASE_URL_UNPOOLED` and loads `.env`. Without `TEST_DATABASE_URL`, the database
suite skips. Native PostgreSQL is required for meaningful concurrent lock tests;
email and Blob calls are mocked.

For changed student journeys, also review session changes across tabs, failed
submissions and retries, earlier reply pages, and permission revocation with
separate accounts. Automated tests do not establish real-device keyboard, photo
picker, offline recovery, or production provider behavior.

## University data

Check domain changes against the official university and
[upstream dataset](https://github.com/Hipo/university-domains-list). Requests from
`/university-request` are reviewed in `/launch`; deploy verified changes to
`data/universities.json` before resolving a request. A request never grants
eligibility automatically. Report vulnerabilities [privately](SECURITY.md).
