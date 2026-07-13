import type { PlanNode } from "~/lib/db/types";
import type { Warning } from "./antipatterns";

const FULL_SCAN_OPERATIONS = new Set([
  "Seq Scan",
  "Table Scan",
  "Clustered Index Scan",
  "SCAN",
]);

const LARGE_TABLE_ROW_THRESHOLD = 10_000;

export function detectPlanAntiPatterns(root: PlanNode): Warning[] {
  const warnings: Warning[] = [];

  function walk(node: PlanNode) {
    const rows = node.actualRows ?? node.estRows ?? 0;
    if (FULL_SCAN_OPERATIONS.has(node.operation) && rows > LARGE_TABLE_ROW_THRESHOLD) {
      warnings.push({
        id: "missing-index-candidate",
        severity: "warning",
        message: `Full scan (${node.operation}) on ${node.table ?? "a table"} touching ~${rows.toLocaleString()} rows.`,
        detail: "Consider adding an index that lets the planner use an index scan instead.",
      });
    }
    for (const child of node.children) walk(child);
  }

  walk(root);
  return warnings;
}
