import { describe, expect, it } from "vitest";
import { summarize } from "~/lib/sql/summarize";

describe("summarize", () => {
  it("describes joins, filters, sorting, and limit for a well-formed query, via the AST path", () => {
    const sql =
      "SELECT u.id, o.total FROM users u JOIN orders o ON o.user_id = u.id WHERE u.status = 'active' ORDER BY o.total DESC LIMIT 10";
    const result = summarize(sql, "postgres");

    expect(result.source).toBe("ast");
    expect(result.sentences.some((s) => /Reads from users/.test(s))).toBe(true);
    expect(result.sentences.some((s) => /Joins orders/.test(s))).toBe(true);
    expect(result.sentences.some((s) => /Filters where/.test(s))).toBe(true);
    expect(result.sentences.some((s) => /Sorts by/.test(s))).toBe(true);
    expect(result.sentences.some((s) => /Limits the result to 10/.test(s))).toBe(true);
  });

  it("flags SELECT *", () => {
    const result = summarize("SELECT * FROM users", "postgres");
    expect(result.sentences.some((s) => /SELECT \*/.test(s))).toBe(true);
  });

  it("falls back to the keyword path when the query can't be parsed", () => {
    const result = summarize("SELECT TOP 10 *!!! FROM ((( broken", "postgres");
    expect(result.source).toBe("keyword");
    expect(result.sentences.length).toBeGreaterThan(0);
  });
});
