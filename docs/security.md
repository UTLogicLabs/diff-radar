# Security posture

## EXPLAIN ANALYZE is opt-in, not default

`EXPLAIN ANALYZE` (Postgres) and `SET STATISTICS XML` (MSSQL) actually execute the submitted
query — including any side effects from `INSERT`/`UPDATE`/`DELETE`, even ones hidden inside a CTE
or subquery a user didn't realize was mutating. Because this tool may be pointed at real or
prod-adjacent databases, the connection form's "Run EXPLAIN ANALYZE" checkbox defaults to
**unchecked**. The default path uses each dialect's non-executing plan variant instead
(`EXPLAIN (FORMAT JSON)` for Postgres, `SET SHOWPLAN_XML ON` for MSSQL). When the checkbox is
checked, the UI shows an explicit inline warning before submission.

SQLite has no execute-and-measure EXPLAIN mode at all — `EXPLAIN QUERY PLAN` never executes the
query regardless of the checkbox, so the checkbox is disabled/hidden for that dialect with an
explanatory note.

## No credential persistence

`ConnectionInfo` (host/user/password or a full connection string) is parsed from the submitted
`request.formData()` inside the route's `action`, used only to open one connection for that
request, and discarded once the request completes. It is never written to a cookie, session,
database, or log. If connection attempts are ever logged for debugging, they must go through a
`redactConnectionInfo()` helper that strips `password`/`connectionString` first — never log the
raw object.

Every adapter closes its connection in a `finally` block so no pooled connection or in-memory
credential outlives the request that created it.

## Deferred: statement timeout (fast-follow, not in v1)

A pasted runaway query can currently hang the server for as long as the database allows. A
fast-follow (not required for the one-day v1) would add a soft per-dialect timeout before running
EXPLAIN: `SET LOCAL statement_timeout` for Postgres, a `request.timeout` on the MSSQL connection
pool, and `PRAGMA busy_timeout` for SQLite.
