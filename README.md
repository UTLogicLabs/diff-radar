# Diff Radar

Paste a SQL query, pick a dialect, and get back:

- a **plain-English summary** of what the query does (joins, filters, aggregations, sorting, limits)
- the **EXPLAIN plan visualized as a tree**, with expensive nodes highlighted
- **warnings** for common anti-patterns: `SELECT *`, missing-index candidates (full scans on large
  tables), and N+1-shaped correlated subqueries

Supports **Postgres**, **MSSQL**, and **SQLite** behind one dialect-agnostic plan representation.

Visual theme (light/dark/system) is ported from the sibling
[portfolio](https://github.com/UTLogicLabs/portfolio) project.

## How it works

1. Enter a dialect and a connection (a connection string, or discrete host/user/password fields;
   SQLite takes a file path instead).
2. Paste a SQL query and submit.
3. The server runs that dialect's non-destructive `EXPLAIN` variant by default — see
   [docs/security.md](docs/security.md) for why `EXPLAIN ANALYZE` (which actually executes the
   query) is opt-in only.
4. The raw plan is normalized into one common tree shape, summarized in English via
   [`node-sql-parser`](https://github.com/taozhi8833998/node-sql-parser), and scanned for
   anti-patterns — see [docs/architecture.md](docs/architecture.md) for the full data flow and
   [docs/decisions.md](docs/decisions.md) for the reasoning behind the stack choices.

## Getting started

Requires Node 22+.

```bash
npm install
npm run dev
```

The app is available at `http://localhost:5173`. It runs as a plain Node server — no external
services are required to start it; you only need a live Postgres/MSSQL/SQLite database to actually
explain a query against.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build |
| `npm start` | Run the production build (`npm run build` first) |
| `npm run typecheck` | Generate route types and run `tsc --noEmit` |
| `npm test` | Run the test suite (Vitest) |

## Testing

`npm test` runs without any live database: SQLite tests use a real temporary `better-sqlite3` file,
and Postgres/MSSQL normalization is tested against recorded `EXPLAIN`/`ShowPlanXML` fixtures in
`test/fixtures/`. See [docs/architecture.md](docs/architecture.md) for how the dialect adapters are
structured.

## Docs

- [docs/architecture.md](docs/architecture.md) — dialect adapter abstraction, shared SQL-parsing
  seam, plan-tree visualization
- [docs/decisions.md](docs/decisions.md) — key technical decisions and why
- [docs/security.md](docs/security.md) — EXPLAIN ANALYZE opt-in model, credential handling

## Deployment

### Docker

```bash
docker build -t diff-radar .
docker run -p 3000:3000 diff-radar
```

### DIY

Deploy the output of `npm run build`:

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

Then run `npm start` (or `react-router-serve ./build/server/index.js` directly).
