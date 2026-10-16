# Security policy

Canteen's users rely on it to stay anonymous. A bug that reveals who wrote something can hurt a real person, so we treat it as critical.

## Reporting a vulnerability

Please **do not open a public issue**. Report privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**. Include steps to reproduce and what an attacker could learn or do.

You'll get an acknowledgement within a few days. Once a fix ships, we're happy to credit you unless you prefer to stay anonymous.

## What we especially want to hear about

- Anything that links a post, reply, like, or report to an account, email, or another alias
- Reading content you shouldn't, such as another university's campus-only posts or hidden content
- Acting as another user, bypassing the university-email check, or abusing sign-in codes
- Image uploads that keep location metadata

Please test only against your own accounts and a local copy of the app, and never access other people's data.

## Dependency review

CI checks production dependencies with `bun audit --production`. The review on 16 October 2026 found no production dependency advisories after updating the Prisma packages to 7.10.1.

The full `bun audit` still reports [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in `braces@3.0.3`, through `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`. It affects deeply nested glob patterns during development and linting; Canteen does not send student input to that code. The advisory lists no patched release. Keep build and lint configuration trusted, and recheck the upstream fix when updating the linter. This finding is documented rather than suppressed or forced onto an incompatible dependency version.
