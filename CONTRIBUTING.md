# Contributing to Canteen

Thanks for helping. Canteen is small and opinionated; this page explains how to get set up and the few rules that keep it safe for the people using it.

## Setup

Follow [Run it locally](README.md#run-it-locally). Before opening a pull request, run:

```sh
bun run check
```

If you touched anything in `server/` or `lib/`, also run the integration tests against a disposable database (see [Checks and tests](README.md#checks-and-tests)).

## Privacy rules

These are not style preferences. A pull request that breaks one will not be merged.

1. **Identity never reaches the client.** Server code converts rows into view models (`PostSummary`, `Thread`, and friends in `server/queries.ts`) before rendering. Never pass a user id, email, or raw Prisma row to a Client Component or return one from a Server Action.
2. **One visibility rule.** Every query and action that reads or acts on a post goes through `visibleTo(viewer)` in `server/queries.ts`. Don't hand-roll a second version.
3. **The session decides who you are.** Server Actions derive the user from `getViewer()`. Never accept a user id, email, or university from the client.
4. **Validate at the boundary.** Server Actions parse their input with the schemas in `lib/validation.ts`.
5. **No identifying logs.** Don't log emails, user ids next to content, IP addresses, or post bodies.
6. **Nothing that links aliases.** Features that let someone connect a student's posts across threads (profiles, "more from this author", per-user counters shown to others) break the product's core promise.

## Conventions

- TypeScript strict mode, no `any`. Prefer the platform and existing dependencies over new packages.
- Server reads live in `server/queries.ts`; writes live in `server/actions.ts`.
- UI follows the existing design system: tokens in `app/globals.css`, primitives in `components/ui`. Highlighter yellow (`you`) is reserved for the student's own voice and primary actions.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`, ...).
- Schema changes need a migration: `bun run db:migrate --name describe_the_change`.

## Adding a university

Universities and their email domains come from `data/universities.json`, a copy of [Hipo/university-domains-list](https://github.com/Hipo/university-domains-list). If yours is missing or wrong, the best fix is upstream; you can also open an issue here with the university's name, country, and student email domain.
