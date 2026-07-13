import sql from "mssql";
import { XMLParser } from "fast-xml-parser";
import type { ConnectionInfo, DialectAdapter, PlanNode, PlanResult } from "./types";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

let nextId = 0;

interface RelOp {
  "@_PhysicalOp"?: string;
  "@_EstimateRows"?: string;
  "@_EstimateIO"?: string;
  "@_EstimateCPU"?: string;
  RelOp?: RelOp | RelOp[];
  RunTimeInformation?: {
    RunTimeCountersPerThread?:
      | { "@_ActualRows"?: string; "@_ActualElapsedms"?: string }
      | { "@_ActualRows"?: string; "@_ActualElapsedms"?: string }[];
  };
  Object?: { "@_Table"?: string; "@_Index"?: string } | { "@_Table"?: string; "@_Index"?: string }[];
  [key: string]: unknown;
}

/** Finds the first nested RelOp node under a ShowPlanXML/STATISTICS XML relational-op subtree. */
function findChildRelOps(node: RelOp): RelOp[] {
  for (const key of Object.keys(node)) {
    const value = (node as Record<string, unknown>)[key];
    if (key === "RelOp") continue;
    if (value && typeof value === "object" && "RelOp" in (value as Record<string, unknown>)) {
      const relOp = (value as { RelOp?: RelOp | RelOp[] }).RelOp;
      if (relOp) return Array.isArray(relOp) ? relOp : [relOp];
    }
  }
  return [];
}

export function normalizeMssqlPlan(xml: string): PlanNode {
  const doc = xmlParser.parse(xml);
  const showPlan = doc.ShowPlanXML ?? doc;
  const stmtSimple = findFirstRelOpRoot(showPlan);
  if (!stmtSimple) {
    throw new Error("Could not locate a RelOp root in the ShowPlan XML output");
  }
  return mapRelOp(stmtSimple);
}

function findFirstRelOpRoot(node: unknown): RelOp | undefined {
  if (!node || typeof node !== "object") return undefined;
  const obj = node as Record<string, unknown>;
  if ("RelOp" in obj) {
    const relOp = obj.RelOp;
    return Array.isArray(relOp) ? (relOp[0] as RelOp) : (relOp as RelOp);
  }
  for (const value of Object.values(obj)) {
    const found = findFirstRelOpRoot(value);
    if (found) return found;
  }
  return undefined;
}

function mapRelOp(node: RelOp): PlanNode {
  const objectInfo = Array.isArray(node.Object) ? node.Object[0] : node.Object;
  const counters = node.RunTimeInformation?.RunTimeCountersPerThread;
  const counter = Array.isArray(counters) ? counters[0] : counters;

  const children = findChildRelOps(node).map(mapRelOp);

  return {
    id: `mssql-${nextId++}`,
    operation: node["@_PhysicalOp"] ?? "Unknown",
    table: objectInfo?.["@_Table"],
    index: objectInfo?.["@_Index"],
    estRows: node["@_EstimateRows"] ? Number(node["@_EstimateRows"]) : undefined,
    estCost:
      node["@_EstimateIO"] || node["@_EstimateCPU"]
        ? Number(node["@_EstimateIO"] ?? 0) + Number(node["@_EstimateCPU"] ?? 0)
        : undefined,
    actualRows: counter?.["@_ActualRows"] ? Number(counter["@_ActualRows"]) : undefined,
    actualTimeMs: counter?.["@_ActualElapsedms"] ? Number(counter["@_ActualElapsedms"]) : undefined,
    children,
  };
}

function buildConfig(conn: Extract<ConnectionInfo, { dialect: "mssql" }>): sql.config | string {
  if (conn.mode === "url") return conn.connectionString;
  return {
    server: conn.server,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    options: {
      encrypt: conn.encrypt ?? true,
      trustServerCertificate: conn.trustServerCertificate ?? false,
    },
  };
}

/** Extracts the XML plan text from whichever recordset mssql attaches it to. */
function extractPlanXml(recordsets: unknown): string | undefined {
  const sets = recordsets as Array<Array<Record<string, unknown>>>;
  for (const set of sets ?? []) {
    for (const row of set ?? []) {
      for (const value of Object.values(row)) {
        if (typeof value === "string" && value.includes("<ShowPlanXML")) return value;
      }
    }
  }
  return undefined;
}

export const mssqlAdapter: DialectAdapter = {
  dialect: "mssql",
  async explainQuery(connectionInfo, querySql, { analyze }) {
    if (connectionInfo.dialect !== "mssql") throw new Error("Expected mssql connection info");

    const pool = await new sql.ConnectionPool(buildConfig(connectionInfo) as sql.config).connect();
    try {
      const request = pool.request();
      const batch = analyze
        ? `SET STATISTICS XML ON;\n${querySql};\nSET STATISTICS XML OFF;`
        : `SET SHOWPLAN_XML ON;\n${querySql};\nSET SHOWPLAN_XML OFF;`;
      const result = await request.batch(batch);
      const planXml = extractPlanXml(result.recordsets);
      if (!planXml) throw new Error("No ShowPlan XML returned by the server");

      const root = normalizeMssqlPlan(planXml);
      const planResult: PlanResult = {
        dialect: "mssql",
        analyzed: analyze,
        root,
        raw: planXml,
      };
      return planResult;
    } finally {
      await pool.close();
    }
  },
};
