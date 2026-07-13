import type { PlanNode as PlanNodeData } from "~/lib/db/types";
import { PlanNode } from "~/components/PlanNode";

interface PlanTreeProps {
  root: PlanNodeData;
}

function maxOf(node: PlanNodeData, key: "actualTimeMs" | "estCost"): number {
  const own = node[key] ?? 0;
  return node.children.reduce((max, child) => Math.max(max, maxOf(child, key)), own);
}

export function PlanTree({ root }: PlanTreeProps) {
  const totalTimeMs = maxOf(root, "actualTimeMs");
  const totalCost = maxOf(root, "estCost");

  return (
    <div className="space-y-2">
      <PlanNode node={root} totalTimeMs={totalTimeMs} totalCost={totalCost} />
    </div>
  );
}
