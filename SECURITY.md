# Security policy

Canteen protects students' identities in shared discussion views. Disclosure of
an author's or reporter's identity, or access to another campus's private
content, can harm real people.

## Report privately

Do not open a public issue containing a vulnerability or personal information.
Use the repository's **Security → Report a vulnerability** flow on GitHub.
Include reproduction steps, the affected boundary and what an attacker could
learn or do. Test only your own accounts and a local copy; never access another
person's data.

Especially relevant reports include identity linkage across threads, campus
visibility bypasses, session or sign-in-code abuse, unauthorized moderation or
account actions, and image metadata or private-image disclosure.

## Privacy boundaries

Aliases protect shared views; account-linked database records remain accessible
to authorized service operators. University-email control does not prove current
enrollment, and content itself can identify its author. Campus hosts have
explicitly assigned access; moderators can review reported content.

Contributor requirements are in [CONTRIBUTING.md](CONTRIBUTING.md). Deployment
owners must follow the [operations runbook](docs/OPERATIONS.md), including stable
auth-secret handling, isolated previews, private-image migration, maintenance,
retention and erasure. The public `/community` page describes these limits to
students.

## Dependency review

CI runs `bun audit --production` against the locked dependency tree. Run it when
updating dependencies, and use `bun audit` to review development dependencies as
well. Assess advisories against actual usage and fix them with compatible
updates; do not suppress findings or force incompatible versions merely to
produce a clean report. An old audit result is not a current security guarantee.

The review on 23 October 2026 found no production dependency advisories across
207 packages. The full `bun audit` still reports
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in
`braces@3.0.3`, through
`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`. It
affects deeply nested glob patterns during development and linting; Canteen does
not send student input to that code. The advisory lists no patched release. Keep
build and lint configuration trusted, and recheck the upstream fix when updating
the linter. This finding is documented rather than suppressed or forced onto an
incompatible dependency version.
