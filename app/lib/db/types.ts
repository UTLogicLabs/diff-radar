export type Dialect = "postgres" | "mssql" | "sqlite";

export type ConnectionInfo =
  | { dialect: "postgres"; mode: "url"; connectionString: string }
  | {
      dialect: "postgres";
      mode: "fields";
      host: string;
      port?: number;
      user: string;
      password: string;
      database: string;
      ssl?: boolean;
    }
  | { dialect: "mssql"; mode: "url"; connectionString: string }
  | {
      dialect: "mssql";
      mode: "fields";
      server: string;
      port?: number;
      user: string;
      password: string;
      database: string;
      encrypt?: boolean;
      trustServerCertificate?: boolean;
    }
  | { dialect: "sqlite"; mode: "file"; filePath: string }
  | { dialect: "sqlite"; mode: "memory" };

export interface PlanNode {
  id: string;
  operation: string;
  table?: string;
  index?: string;
  estRows?: number;
  actualRows?: number;
  estCost?: number;
  actualTimeMs?: number;
  loops?: number;
  extra?: Record<string, unknown>;
  children: PlanNode[];
}

export interface PlanResult {
  dialect: Dialect;
  analyzed: boolean;
  root: PlanNode;
  totalTimeMs?: number;
  raw: unknown;
}

export interface DialectAdapter {
  dialect: Dialect;
  explainQuery(conn: ConnectionInfo, sql: string, opts: { analyze: boolean }): Promise<PlanResult>;
}

/** Strips secrets before logging a connection attempt. Never log a raw ConnectionInfo. */
export function redactConnectionInfo(conn: ConnectionInfo): Record<string, unknown> {
  const { ...rest } = conn as Record<string, unknown>;
  if ("password" in rest) rest.password = "[redacted]";
  if ("connectionString" in rest) rest.connectionString = "[redacted]";
  return rest;
}
