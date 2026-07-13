import type { QuerySummary as QuerySummaryData } from "~/lib/sql/summarize";

export function QuerySummary({ summary }: { summary: QuerySummaryData }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Summary</h2>
        <span className="text-xs text-muted-foreground">
          {summary.source === "ast" ? "generated via SQL parse" : "generated via keyword match"}
        </span>
      </div>
      <ul className="prose prose-sm dark:prose-invert max-w-none list-disc pl-5">
        {summary.sentences.map((sentence, i) => (
          <li key={i}>{sentence}</li>
        ))}
      </ul>
    </div>
  );
}
