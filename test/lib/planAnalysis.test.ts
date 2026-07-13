import { describe, expect, it } from "vitest";
import type { PlanNode } from "~/lib/db/types";
import { detectPlanAntiPatterns } from "~/lib/sql/planAnalysis";

function node(partial: Partial<PlanNode> & { operation: string }): PlanNode {
  return { id: "n", children: [], ...partial };
}

describe("detectPlanAntiPatterns", () => {
  it("flags a sequential scan on a large table", () => {
    const root = node({ operation: "Seq Scan", table: "orders", actualRows: 50_000 });
    const warnings = detectPlanAntiPatterns(root);
    expect(warnings.some((w) => w.id === "missing-index-candidate" && w.message.includes("orders"))).toBe(true);
  });

  it("does not flag a sequential scan on a small table", () => {
    const root = node({ operation: "Seq Scan", table: "settings", actualRows: 20 });
    const warnings = detectPlanAntiPatterns(root);
    expect(warnings).toEqual([]);
  });

  it("does not flag an index scan regardless of row count", () => {
    const root = node({ operation: "Index Scan", table: "orders", actualRows: 500_000 });
    const warnings = detectPlanAntiPatterns(root);
    expect(warnings).toEqual([]);
  });

  it("walks child nodes", () => {
    const root = node({
      operation: "Hash Join",
      children: [node({ operation: "Seq Scan", table: "orders", estRows: 100_000 })],
    });
    const warnings = detectPlanAntiPatterns(root);
    expect(warnings).toHaveLength(1);
  });
});
