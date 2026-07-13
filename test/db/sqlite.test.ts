import { describe, expect, it, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { sqliteAdapter } from "~/lib/db/sqlite";

// The adapter opens its own connection per explainQuery() call by file path, so tests use a
// throwaway temp file rather than a shared :memory: handle (which only one connection can see).
const dbPath = path.join(tmpdir(), `query-explainer-test-${Date.now()}.sqlite`);

afterEach(() => {
  try {
    unlinkSync(dbPath);
  } catch {
    // already removed
  }
});

describe("sqliteAdapter.explainQuery", () => {
  it("returns a normalized plan tree for a filtered select using an index", async () => {
    const setup = new Database(dbPath);
    setup.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)");
    setup.exec("CREATE INDEX idx_users_email ON users(email)");
    setup.exec("INSERT INTO users (email) VALUES ('a@example.com'), ('b@example.com')");
    setup.close();

    const result = await sqliteAdapter.explainQuery(
      { dialect: "sqlite", mode: "file", filePath: dbPath },
      "SELECT * FROM users WHERE email = 'a@example.com'",
      { analyze: false },
    );

    expect(result.dialect).toBe("sqlite");
    expect(result.analyzed).toBe(false);
    expect(result.root.operation).toMatch(/SEARCH|SCAN/);
    expect(result.root.table).toBe("users");
  });
});
