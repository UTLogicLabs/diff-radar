import type { Dialect } from "~/lib/db/types";
import { parseSql, type ParsedQuery, type SqlAst } from "./parse";

export interface Warning {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
  detail?: string;
}

export function detectAntiPatterns(sql: string, dialect: Dialect): Warning[] {
  const parsed = parseSql(sql, dialect);
  if (!parsed.ok) return [];
  return detectAstAntiPatterns(parsed);
}

export function detectAstAntiPatterns(parsed: ParsedQuery): Warning[] {
  const statement = Array.isArray(parsed.ast) ? parsed.ast[0] : parsed.ast;
  if (!statement || statement.type !== "select") return [];

  const warnings: Warning[] = [];

  if (hasSelectStar(statement)) {
    warnings.push({
      id: "select-star",
      severity: "warning",
      message: "Query uses SELECT * instead of explicit columns.",
      detail: "Selecting all columns pulls unnecessary data and breaks if the schema changes.",
    });
  }

  for (const subquery of findNestedSelects(statement)) {
    if (isCorrelatedSubquery(subquery)) {
      warnings.push({
        id: "n-plus-1-subquery",
        severity: "warning",
        message: "Shape suggests a correlated subquery (potential N+1 pattern).",
        detail:
          "A nested SELECT references a column from an outer table, meaning it may be re-evaluated once per outer row.",
      });
      break;
    }
  }

  return warnings;
}

function hasSelectStar(statement: SqlAst): boolean {
  return Array.isArray(statement.columns) && statement.columns.some((c: SqlAst) => c.expr?.column === "*");
}

/** Recursively finds every nested `select`-type AST node under (but not equal to) the root statement. */
function findNestedSelects(root: SqlAst): SqlAst[] {
  const found: SqlAst[] = [];

  function walk(node: unknown, isRoot: boolean) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, false);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (!isRoot && obj.type === "select") {
      found.push(obj);
    }
    for (const value of Object.values(obj)) {
      walk(value, false);
    }
  }

  walk(root, true);
  return found;
}

/** A subquery is correlated if its WHERE clause compares a column against a table outside its own FROM. */
function isCorrelatedSubquery(subquery: SqlAst): boolean {
  const innerScope = new Set<string>(
    (subquery.from ?? [])
      .filter((f: SqlAst) => typeof f === "object" && (f.table || f.as))
      .map((f: SqlAst) => f.as ?? f.table),
  );

  let correlated = false;

  function walk(node: unknown) {
    if (!node || typeof node !== "object" || correlated) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.type === "column_ref" && typeof obj.table === "string" && !innerScope.has(obj.table)) {
      correlated = true;
      return;
    }
    if (obj.type === "select") return; // don't descend into a further-nested subquery here
    for (const value of Object.values(obj)) walk(value);
  }

  walk(subquery.where);
  return correlated;
}
