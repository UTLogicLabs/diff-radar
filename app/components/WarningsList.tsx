import { Icon } from "~/components/Icon";
import type { Warning } from "~/lib/sql/antipatterns";

export function WarningsList({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 flex items-center gap-2 text-muted-foreground">
        <Icon name="check" />
        <span>No anti-patterns detected.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h2 className="font-semibold">Warnings</h2>
      <ul className="space-y-2">
        {warnings.map((warning) => (
          <li key={warning.id} className="flex gap-2 rounded-md bg-warning/10 border border-warning/30 p-2.5">
            <Icon name="warning" className="shrink-0 mt-0.5 text-warning" />
            <div>
              <p className="font-medium">{warning.message}</p>
              {warning.detail && <p className="text-sm text-muted-foreground">{warning.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
