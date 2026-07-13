import { useState } from "react";
import type { Dialect } from "~/lib/db/types";

const DIALECTS: { value: Dialect; label: string }[] = [
  { value: "postgres", label: "Postgres" },
  { value: "mssql", label: "MSSQL" },
  { value: "sqlite", label: "SQLite" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function ConnectionForm({ defaultDialect }: { defaultDialect?: Dialect }) {
  const [dialect, setDialect] = useState<Dialect>(defaultDialect ?? "postgres");
  const [mode, setMode] = useState<"url" | "fields">("url");
  const [analyze, setAnalyze] = useState(false);

  return (
    <div className="space-y-4">
      <fieldset className="flex gap-2">
        <legend className="sr-only">Dialect</legend>
        {DIALECTS.map((d) => (
          <label
            key={d.value}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
              dialect === d.value ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="dialect"
              value={d.value}
              checked={dialect === d.value}
              onChange={() => setDialect(d.value)}
              className="sr-only"
            />
            {d.label}
          </label>
        ))}
      </fieldset>

      {dialect === "sqlite" ? (
        <Field label="Database file path">
          <input type="text" name="filePath" placeholder="./example.sqlite" className={inputClass} required />
        </Field>
      ) : (
        <>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="mode" value="url" checked={mode === "url"} onChange={() => setMode("url")} />
              Connection string
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="mode"
                value="fields"
                checked={mode === "fields"}
                onChange={() => setMode("fields")}
              />
              Discrete fields
            </label>
          </div>

          {mode === "url" ? (
            <Field label="Connection string">
              <input
                type="text"
                name="connectionString"
                placeholder={dialect === "postgres" ? "postgres://user:pass@host:5432/db" : "Server=host;Database=db;..."}
                className={inputClass}
                required
              />
            </Field>
          ) : dialect === "postgres" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Host">
                <input type="text" name="host" className={inputClass} required />
              </Field>
              <Field label="Port">
                <input type="number" name="port" placeholder="5432" className={inputClass} />
              </Field>
              <Field label="User">
                <input type="text" name="user" className={inputClass} required />
              </Field>
              <Field label="Password">
                <input type="password" name="password" className={inputClass} required />
              </Field>
              <Field label="Database">
                <input type="text" name="database" className={inputClass} required />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Server">
                <input type="text" name="server" className={inputClass} required />
              </Field>
              <Field label="Port">
                <input type="number" name="port" placeholder="1433" className={inputClass} />
              </Field>
              <Field label="User">
                <input type="text" name="user" className={inputClass} required />
              </Field>
              <Field label="Password">
                <input type="password" name="password" className={inputClass} required />
              </Field>
              <Field label="Database">
                <input type="text" name="database" className={inputClass} required />
              </Field>
            </div>
          )}
        </>
      )}

      <Field label="SQL query">
        <textarea name="sql" rows={6} className={`${inputClass} font-mono`} required />
      </Field>

      {dialect !== "sqlite" && (
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="analyze"
              value="true"
              checked={analyze}
              onChange={(e) => setAnalyze(e.target.checked)}
            />
            Run EXPLAIN ANALYZE (executes the query)
          </label>
          {analyze && (
            <p className="mt-1.5 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
              This will actually execute your query, including any side effects from INSERT/UPDATE/DELETE, even
              inside a CTE or subquery. Only enable this against a database you&apos;re comfortable modifying.
            </p>
          )}
        </div>
      )}
      {dialect === "sqlite" && (
        <p className="text-xs text-muted-foreground">
          SQLite&apos;s query plan is always estimated (EXPLAIN QUERY PLAN) and never executes the query.
        </p>
      )}

      <button
        type="submit"
        className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
      >
        Explain query
      </button>
    </div>
  );
}
