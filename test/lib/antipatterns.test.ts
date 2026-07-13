import { describe, expect, it } from "vitest";
import { detectAntiPatterns } from "~/lib/sql/antipatterns";

describe("detectAntiPatterns", () => {
  it("flags SELECT *", () => {
    const warnings = detectAntiPatterns("SELECT * FROM users", "postgres");
    expect(warnings.some((w) => w.id === "select-star")).toBe(true);
  });

  it("does not flag an explicit column list", () => {
    const warnings = detectAntiPatterns("SELECT id, email FROM users", "postgres");
    expect(warnings.some((w) => w.id === "select-star")).toBe(false);
  });

  it("flags a correlated subquery (N+1-shaped)", () => {
    const sql = "SELECT id FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)";
    const warnings = detectAntiPatterns(sql, "postgres");
    expect(warnings.some((w) => w.id === "n-plus-1-subquery")).toBe(true);
  });

  it("does not flag an uncorrelated subquery", () => {
    const sql = "SELECT id FROM users WHERE id IN (SELECT user_id FROM orders WHERE total > 100)";
    const warnings = detectAntiPatterns(sql, "postgres");
    expect(warnings.some((w) => w.id === "n-plus-1-subquery")).toBe(false);
  });

  it("returns no warnings for an unparseable query", () => {
    const warnings = detectAntiPatterns("SELECT TOP 10 *!!! FROM ((( broken", "postgres");
    expect(warnings).toEqual([]);
  });
});
