import type { Dialect, DialectAdapter } from "./types";
import { postgresAdapter } from "./postgres";
import { mssqlAdapter } from "./mssql";
import { sqliteAdapter } from "./sqlite";

const ADAPTERS: Record<Dialect, DialectAdapter> = {
  postgres: postgresAdapter,
  mssql: mssqlAdapter,
  sqlite: sqliteAdapter,
};

export function getAdapter(dialect: Dialect): DialectAdapter {
  return ADAPTERS[dialect];
}

export type { Dialect, ConnectionInfo, PlanNode, PlanResult, DialectAdapter } from "./types";
