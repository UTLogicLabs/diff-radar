# Key decisions

## Plain Node runtime, not Cloudflare Workers

The sibling `portfolio` project runs on Cloudflare Workers/Pages, but Query Explainer targets a
plain Node server (`@react-router/node`/`@react-router/serve`) instead. The `pg`, `mssql`, and
`better-sqlite3` drivers are native Node modules that don't run on Workers' edge runtime, and this
app's core job — opening arbitrary TCP connections to user-supplied databases — doesn't fit an
edge deployment model regardless of driver availability.

## `better-sqlite3` over `node:sqlite`

Node's built-in `node:sqlite` is still experimental and version-gated across LTS lines, so relying
on it risks breaking on whatever Node version actually runs this app in CI/production.
`better-sqlite3` is synchronous (simple to wrap in an async-shaped adapter), works well for
`:memory:` fixture databases in tests, and is the de facto standard with well-documented
`EXPLAIN QUERY PLAN` behavior.

## Theme copied and adapted, not shared as a package

`app/lib/theme.ts`, `app/components/ThemeToggle.tsx`, and the `app.css` `@theme` token block are
ported from `/Users/joshuadix/Development/personal/portfolio` by copying and adapting, not by
extracting a shared npm package. These are two unrelated one-off repos with no monorepo/workspace
tooling between them; the theme module is small (~80 lines) and has no blog-specific coupling once
`Nav`/`Footer` are dropped, so a shared package would be pure overhead for a one-day project.

## `node-sql-parser` from day one, not keyword templating

The product brief's "stretch goal" was to eventually replace keyword-templated summaries with a
real SQL parser. Since `node-sql-parser` already supports all three target dialects
(postgresql/transactsql/sqlite) out of the box, there's no reason to ship a naive keyword-matcher
first and rewrite later — the AST-based summary is the v1 implementation. A regex/keyword fallback
(`summarize.legacy.ts`) exists only for queries the parser can't handle.

## EXPLAIN-only by default, ANALYZE is opt-in

See [security.md](security.md).
