import { Client } from "pg";
import type { ConnectionInfo, DialectAdapter, PlanNode, PlanResult } from "./types";

interface PostgresPlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Index Name"?: string;
  "Plan Rows"?: number;
  "Actual Rows"?: number;
  "Total Cost"?: number;
  "Actual Total Time"?: number;
  "Actual Loops"?: number;
  Plans?: PostgresPlanNode[];
  [key: string]: unknown;
}

let nextId = 0;

export function normalizePostgresPlan(raw: unknown): PlanNode {
  const rows = raw as Array<{ "QUERY PLAN": Array<{ Plan: PostgresPlanNode; "Execution Time"?: number }> }>;
  const plan = rows[0]["QUERY PLAN"][0].Plan;
  return mapNode(plan);
}

function mapNode(node: PostgresPlanNode): PlanNode {
  const { "Node Type": operation, "Relation Name": table, "Index Name": index, ...rest } = node;
  return {
    id: `pg-${nextId++}`,
    operation,
    table,
    index,
    estRows: node["Plan Rows"],
    actualRows: node["Actual Rows"],
    estCost: node["Total Cost"],
    actualTimeMs: node["Actual Total Time"],
    loops: node["Actual Loops"],
    extra: rest,
    children: (node.Plans ?? []).map(mapNode),
  };
}

function buildConnectionString(conn: Extract<ConnectionInfo, { dialect: "postgres" }>): string {
  if (conn.mode === "url") return conn.connectionString;
  const params = new URLSearchParams();
  if (conn.ssl) params.set("sslmode", "require");
  const query = params.toString();
  return `postgres://${encodeURIComponent(conn.user)}:${encodeURIComponent(conn.password)}@${conn.host}:${
    conn.port ?? 5432
  }/${conn.database}${query ? `?${query}` : ""}`;
}

export const postgresAdapter: DialectAdapter = {
  dialect: "postgres",
  async explainQuery(connectionInfo, sql, { analyze }) {
    if (connectionInfo.dialect !== "postgres") throw new Error("Expected postgres connection info");

    const client = new Client({ connectionString: buildConnectionString(connectionInfo) });
    await client.connect();
    try {
      const explainSql = analyze
        ? `EXPLAIN (ANALYZE, FORMAT JSON, BUFFERS) ${sql}`
        : `EXPLAIN (FORMAT JSON) ${sql}`;
      const result = await client.query(explainSql);
      const root = normalizePostgresPlan(result.rows);
      const totalTimeMs = analyze
        ? (result.rows[0]["QUERY PLAN"][0] as { "Execution Time"?: number })["Execution Time"]
        : undefined;

      const planResult: PlanResult = {
        dialect: "postgres",
        analyzed: analyze,
        root,
        totalTimeMs,
        raw: result.rows,
      };
      return planResult;
    } finally {
      await client.end();
    }
  },
};
