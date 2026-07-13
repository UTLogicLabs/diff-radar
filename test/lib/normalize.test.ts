import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizePostgresPlan } from "~/lib/db/postgres";
import { normalizeMssqlPlan } from "~/lib/db/mssql";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");

describe("normalizePostgresPlan", () => {
  it("maps a recorded EXPLAIN (FORMAT JSON) join plan into a PlanNode tree", () => {
    const raw = JSON.parse(readFileSync(path.join(FIXTURES_DIR, "postgres", "join-explain.json"), "utf-8"));
    const root = normalizePostgresPlan(raw);

    expect(root.operation).toBe("Hash Join");
    expect(root.children).toHaveLength(2);
    expect(root.children[0]).toMatchObject({ operation: "Seq Scan", table: "orders", actualRows: 49800 });
    expect(root.children[1]).toMatchObject({ operation: "Index Scan", table: "users", index: "users_pkey" });
  });
});

describe("normalizeMssqlPlan", () => {
  it("maps a recorded ShowPlanXML join plan into a PlanNode tree", () => {
    const xml = readFileSync(path.join(FIXTURES_DIR, "mssql", "join-showplan.xml"), "utf-8");
    const root = normalizeMssqlPlan(xml);

    expect(root.operation).toBe("Hash Match");
    expect(root.estRows).toBe(100);
    expect(root.children).toHaveLength(2);
    expect(root.children[0]).toMatchObject({ operation: "Table Scan", table: "[orders]", estRows: 50000 });
    expect(root.children[1]).toMatchObject({ operation: "Clustered Index Scan", table: "[users]", index: "[PK_users]" });
  });
});
