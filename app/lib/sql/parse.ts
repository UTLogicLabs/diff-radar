import pkg from "node-sql-parser";
const { Parser } = pkg;
import type { Dialect } from "~/lib/db/types";

// node-sql-parser's TypeScript types are partial/any-heavy; the AST shape is treated loosely
// here and downstream (summarize.ts, antipatterns.ts) rather than fighting its type definitions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SqlAst = any;

export interface ParsedQuery {
  ok: true;
  ast: SqlAst;
  dialect: Dialect;
}

export interface ParseFailure {
  ok: false;
  error: string;
}

const DIALECT_TO_PARSER: Record<Dialect, string> = {
  postgres: "postgresql",
  mssql: "transactsql",
  sqlite: "sqlite",
};

export function parseSql(sqlText: string, dialect: Dialect): ParsedQuery | ParseFailure {
  try {
    const parser = new Parser();
    const ast = parser.astify(sqlText, { database: DIALECT_TO_PARSER[dialect] });
    return { ok: true, ast, dialect };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
