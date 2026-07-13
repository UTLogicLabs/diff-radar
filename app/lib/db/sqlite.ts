import Database from "better-sqlite3";
import type { ConnectionInfo, DialectAdapter, PlanNode, PlanResult } from "./types";

interface QueryPlanRow {
  id: number;
  parent: number;
  notused: number;
  detail: string;
}

const SCAN_DETAIL_RE = /^(SCAN|SEARCH)\s+(\S+)(?:\s+USING\s+(?:INDEX|COVERING INDEX)\s+(\S+))?/i;

let nextId = 0;

export function normalizeSqlitePlan(rows: QueryPlanRow[]): PlanNode {
  const byParent = new Map<number, QueryPlanRow[]>();
  for (const row of rows) {
    const siblings = byParent.get(row.parent) ?? [];
    siblings.push(row);
    byParent.set(row.parent, siblings);
  }

  function build(row: QueryPlanRow): PlanNode {
    const match = row.detail.match(SCAN_DETAIL_RE);
    return {
      id: `sqlite-${nextId++}`,
      operation: match ? match[1].toUpperCase() : row.detail,
      table: match?.[2],
      index: match?.[3],
      extra: { detail: row.detail },
      children: (byParent.get(row.id) ?? []).map(build),
    };
  }

  const roots = byParent.get(0) ?? [];
  if (roots.length === 0) {
    return { id: `sqlite-${nextId++}`, operation: "EMPTY PLAN", children: [] };
  }
  if (roots.length === 1) return build(roots[0]);

  return {
    id: `sqlite-${nextId++}`,
    operation: "QUERY PLAN",
    children: roots.map(build),
  };
}

function openDatabase(conn: Extract<ConnectionInfo, { dialect: "sqlite" }>) {
  return conn.mode === "memory" ? new Database(":memory:") : new Database(conn.filePath);
}

export const sqliteAdapter: DialectAdapter = {
  dialect: "sqlite",
  async explainQuery(connectionInfo, sql, { analyze }) {
    if (connectionInfo.dialect !== "sqlite") throw new Error("Expected sqlite connection info");

    const db = openDatabase(connectionInfo);
    try {
      const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as QueryPlanRow[];
      const root = normalizeSqlitePlan(rows);

      // SQLite's EXPLAIN QUERY PLAN never executes the query, regardless of what was requested.
      const planResult: PlanResult = {
        dialect: "sqlite",
        analyzed: false,
        root,
        raw: rows,
      };
      void analyze;
      return planResult;
    } finally {
      db.close();
    }
  },
};
