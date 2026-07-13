import type { Dialect } from "~/lib/db/types";
import { parseSql, type SqlAst } from "./parse";
import { summarizeFromKeywords } from "./summarize.legacy";

export interface QuerySummary {
  sentences: string[];
  source: "ast" | "keyword";
}

export function summarize(sql: string, dialect: Dialect): QuerySummary {
  const parsed = parseSql(sql, dialect);
  if (parsed.ok) {
    return { sentences: summarizeFromAst(parsed.ast), source: "ast" };
  }
  return { sentences: summarizeFromKeywords(sql), source: "keyword" };
}

function columnLabel(col: SqlAst): string {
  if (col.expr?.column === "*") return "*";
  const table = col.expr?.table;
  const name = col.expr?.column?.expr?.value ?? col.expr?.column ?? col.expr?.value ?? "?";
  return table ? `${table}.${name}` : String(name);
}

function tableLabel(from: SqlAst): string {
  if (!from.table) return "a subquery";
  return from.as ? `${from.table} (${from.as})` : from.table;
}

function exprToString(expr: SqlAst): string {
  if (!expr) return "";
  if (expr.type === "column_ref") {
    const name = expr.column?.expr?.value ?? expr.column;
    return expr.table ? `${expr.table}.${name}` : String(name);
  }
  if (expr.type === "single_quote_string") return `'${expr.value}'`;
  if (expr.type === "number") return String(expr.value);
  if (expr.type === "binary_expr") {
    return `${exprToString(expr.left)} ${expr.operator} ${exprToString(expr.right)}`;
  }
  return "a condition";
}

function summarizeFromAst(ast: SqlAst): string[] {
  const statement = Array.isArray(ast) ? ast[0] : ast;
  if (!statement || statement.type !== "select") {
    return [`This is a ${statement?.type ?? "non-SELECT"} statement.`];
  }

  const sentences: string[] = [];

  const isSelectStar = Array.isArray(statement.columns) && statement.columns.some((c: SqlAst) => columnLabel(c) === "*");
  if (isSelectStar) {
    sentences.push("Selects all columns (SELECT *).");
  } else if (Array.isArray(statement.columns)) {
    const labels = statement.columns.slice(0, 4).map(columnLabel);
    sentences.push(`Selects ${labels.join(", ")}${statement.columns.length > 4 ? ", ..." : ""}.`);
  }

  const from: SqlAst[] = statement.from ?? [];
  const base = from.find((f) => !f.join);
  const joins = from.filter((f) => f.join);
  if (base) {
    sentences.push(`Reads from ${tableLabel(base)}.`);
  }
  for (const join of joins) {
    sentences.push(`Joins ${tableLabel(join)} (${join.join}).`);
  }

  if (statement.where) {
    sentences.push(`Filters where ${exprToString(statement.where)}.`);
  }

  if (statement.groupby?.columns?.length) {
    const cols = statement.groupby.columns.map((c: SqlAst) => exprToString(c)).join(", ");
    sentences.push(`Groups rows by ${cols}.`);
  }

  if (statement.having) {
    sentences.push(`Filters groups where ${exprToString(statement.having)}.`);
  }

  if (Array.isArray(statement.orderby) && statement.orderby.length) {
    const cols = statement.orderby
      .map((o: SqlAst) => `${exprToString(o.expr)} ${o.type ?? "ASC"}`)
      .join(", ");
    sentences.push(`Sorts by ${cols}.`);
  }

  const limitValue = statement.limit?.value?.[0]?.value;
  if (limitValue !== undefined) {
    sentences.push(`Limits the result to ${limitValue} row(s).`);
  }

  if (sentences.length === 0) {
    sentences.push("Selects rows with no filters, joins, or sorting.");
  }

  return sentences;
}
