import { Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/_index";
import { ConnectionForm } from "~/components/ConnectionForm";
import { QuerySummary } from "~/components/QuerySummary";
import { PlanTree } from "~/components/PlanTree";
import { WarningsList } from "~/components/WarningsList";
import { getAdapter } from "~/lib/db";
import type { ConnectionInfo, Dialect, PlanResult } from "~/lib/db/types";
import { summarize, type QuerySummary as QuerySummaryData } from "~/lib/sql/summarize";
import { detectAstAntiPatterns } from "~/lib/sql/antipatterns";
import { detectPlanAntiPatterns } from "~/lib/sql/planAnalysis";
import { parseSql } from "~/lib/sql/parse";
import type { Warning } from "~/lib/sql/antipatterns";

export function meta() {
  return [
    { title: "Query Explainer" },
    { name: "description", content: "Paste a SQL query and get a plain-English breakdown plus a visualized execution plan." },
  ];
}

type ActionData = { error: string } | { planResult: PlanResult; summary: QuerySummaryData; warnings: Warning[] };

function buildConnectionInfo(formData: FormData, dialect: Dialect): ConnectionInfo {
  if (dialect === "sqlite") {
    const filePath = String(formData.get("filePath") ?? "");
    return { dialect: "sqlite", mode: "file", filePath };
  }

  const mode = String(formData.get("mode") ?? "url");
  if (mode === "url") {
    const connectionString = String(formData.get("connectionString") ?? "");
    return dialect === "postgres"
      ? { dialect: "postgres", mode: "url", connectionString }
      : { dialect: "mssql", mode: "url", connectionString };
  }

  const port = formData.get("port") ? Number(formData.get("port")) : undefined;
  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  const database = String(formData.get("database") ?? "");

  if (dialect === "postgres") {
    return { dialect: "postgres", mode: "fields", host: String(formData.get("host") ?? ""), port, user, password, database };
  }
  return { dialect: "mssql", mode: "fields", server: String(formData.get("server") ?? ""), port, user, password, database };
}

export async function action({ request }: Route.ActionArgs): Promise<ActionData> {
  const formData = await request.formData();
  const dialect = String(formData.get("dialect") ?? "postgres") as Dialect;
  const sql = String(formData.get("sql") ?? "").trim();
  const analyze = formData.get("analyze") === "true";

  if (!sql) return { error: "Please enter a SQL query." };

  const connectionInfo = buildConnectionInfo(formData, dialect);

  try {
    const planResult = await getAdapter(dialect).explainQuery(connectionInfo, sql, { analyze });
    const summary = summarize(sql, dialect);
    const parsed = parseSql(sql, dialect);
    const astWarnings = parsed.ok ? detectAstAntiPatterns(parsed) : [];
    const planWarnings = detectPlanAntiPatterns(planResult.root);

    return { planResult, summary, warnings: [...astWarnings, ...planWarnings] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to explain query." };
  }
}

export default function Index() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Paste a SQL query, pick a dialect, and connect to a database to see a plain-English summary, a visualized
        execution plan, and warnings for common anti-patterns.
      </p>

      <Form method="post" className="rounded-lg border border-border p-4">
        <ConnectionForm />
      </Form>

      {isSubmitting && <p className="text-muted-foreground">Running EXPLAIN&hellip;</p>}

      {actionData && "error" in actionData && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-warning-foreground">
          {actionData.error}
        </div>
      )}

      {actionData && "planResult" in actionData && (
        <div className="space-y-4">
          <QuerySummary summary={actionData.summary} />
          <WarningsList warnings={actionData.warnings} />
          <div className="rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-3">
              Execution plan {actionData.planResult.analyzed ? "(actual, from EXPLAIN ANALYZE)" : "(estimated)"}
            </h2>
            <PlanTree root={actionData.planResult.root} />
          </div>
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-semibold">Raw output</summary>
            <pre className="mt-2 overflow-x-auto text-xs font-mono">
              {JSON.stringify(actionData.planResult.raw, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
