import type { PlanNode as PlanNodeData } from "~/lib/db/types";
import { formatMs, formatNumber } from "~/lib/format";

interface PlanNodeProps {
  node: PlanNodeData;
  totalTimeMs: number;
  totalCost: number;
}

function Badge({ label, value }: { label: string; value: string | undefined }) {
  if (value === undefined) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      <span className="font-medium">{label}</span>
      {value}
    </span>
  );
}

export function PlanNode({ node, totalTimeMs, totalCost }: PlanNodeProps) {
  const timeShare = totalTimeMs > 0 && node.actualTimeMs !== undefined ? node.actualTimeMs / totalTimeMs : 0;
  const costShare = totalCost > 0 && node.estCost !== undefined ? node.estCost / totalCost : 0;
  const isExpensive = timeShare > 0.25 || costShare > 0.2;

  return (
    <div className="space-y-2">
      <div
        className={`rounded-lg border border-border p-3 ${isExpensive ? "border-l-4 border-l-warning" : ""}`}
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold">{node.operation}</span>
          {node.table && <span className="font-mono text-sm text-muted-foreground">{node.table}</span>}
          {node.index && <span className="font-mono text-xs text-muted-foreground">via {node.index}</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge label="est rows" value={formatNumber(node.estRows)} />
          <Badge label="actual rows" value={formatNumber(node.actualRows)} />
          <Badge label="cost" value={formatNumber(node.estCost)} />
          <Badge label="time" value={formatMs(node.actualTimeMs)} />
          {node.loops !== undefined && node.loops > 1 && <Badge label="loops" value={String(node.loops)} />}
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="pl-6 border-l border-border space-y-2">
          {node.children.map((child) => (
            <PlanNode key={child.id} node={child} totalTimeMs={totalTimeMs} totalCost={totalCost} />
          ))}
        </div>
      )}
    </div>
  );
}
