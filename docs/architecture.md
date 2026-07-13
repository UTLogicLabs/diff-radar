# Architecture

## Overview

Query Explainer is a single-route React Router v7 (framework mode) app. A user submits a
dialect, a database connection, and a SQL query; the server opens a connection, runs the
dialect's EXPLAIN variant, normalizes the result into a common plan tree, and derives a
plain-English summary and a list of anti-pattern warnings — all in one request/response cycle.

## Dialect adapter abstraction

`app/lib/db/types.ts` defines the contract every dialect implements:

```ts
interface DialectAdapter {
  dialect: Dialect;
  explainQuery(conn: ConnectionInfo, sql: string, opts: { analyze: boolean }): Promise<PlanResult>;
}
```

`explainQuery` returns a `PlanResult` wrapping a normalized `PlanNode` tree — a dialect-agnostic
shape (`operation`, `table`, `index`, `estRows`, `actualRows`, `estCost`, `actualTimeMs`, `loops`,
`children`). Every UI component downstream of the adapter (`PlanTree`, `PlanNode`,
`planAnalysis.ts`) only ever sees `PlanNode` — never a raw `pg`/`mssql`/`better-sqlite3` shape.
This is what lets one tree-visualization component and one "missing index" heuristic work
identically across all three dialects.

`app/lib/db/index.ts` exports `getAdapter(dialect)` and is the *only* file outside `db/` allowed
to import a specific adapter. This keeps the adapters swappable/replaceable independently.

Each adapter picks the least-destructive EXPLAIN variant available for that dialect by default,
and only executes the query when the user opts into `analyze: true`:

| Dialect  | Default (no execution)      | Opt-in (executes query)              |
|----------|------------------------------|----------------------------------------|
| Postgres | `EXPLAIN (FORMAT JSON)`       | `EXPLAIN (ANALYZE, FORMAT JSON, BUFFERS)` |
| MSSQL    | `SET SHOWPLAN_XML ON`         | `SET STATISTICS XML ON`                |
| SQLite   | `EXPLAIN QUERY PLAN` (always) | same — no execute-and-measure mode exists |

The raw-output parsing (Postgres JSON, MSSQL `ShowPlanXML`, SQLite's flat query-plan rows) is
extracted into pure functions (`normalizePostgresPlan`, `normalizeMssqlPlan`, the SQLite
tree-builder) separate from the connection I/O, so they can be unit-tested against recorded
fixtures without a live database.

## Shared SQL parsing seam (summary + anti-patterns)

`app/lib/sql/parse.ts` wraps `node-sql-parser` behind `parseSql(sql, dialect): ParsedQuery |
ParseFailure`. Both `summarize.ts` (plain-English summary) and `antipatterns.ts` (SELECT * /
correlated-subquery detection) consume the same `ParsedQuery`, so the AST is computed once per
request and both features share the same understanding of the query's structure.

If parsing fails (vendor-specific syntax the parser doesn't support), `summarize.ts` falls back
to `summarize.legacy.ts`'s keyword/regex pass. `antipatterns.ts` has no such fallback — AST-based
checks are simply skipped on parse failure, since a heuristic on failed-to-parse text is not
reliable enough to be worth emitting.

**Stretch-goal seam**: because everything downstream depends only on the `ParsedQuery` interface,
improving summary fidelity (e.g. handling window functions, nested subqueries, CTEs) means
editing `summarizeFromAst`'s traversal logic, or swapping `node-sql-parser` for a different AST
library behind the same interface — no changes to the route, the DB layer, or the warnings
composition.

## Plan-tree-derived warnings

`planAnalysis.ts` is deliberately separate from the AST-based `antipatterns.ts`: it operates on
the normalized `PlanNode` tree instead of the parsed SQL, because row-count estimates (needed to
flag "full scan on a large table" as a missing-index candidate) only exist after a live EXPLAIN
round-trip. Both modules return the same `Warning` shape and are concatenated before rendering.
