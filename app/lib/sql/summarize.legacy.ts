/** Keyword/regex fallback used only when parseSql() fails to produce an AST. */
export function summarizeFromKeywords(sql: string): string[] {
  const sentences: string[] = [];
  const upper = sql.toUpperCase();

  if (/SELECT\s+\*/i.test(sql)) {
    sentences.push("Selects all columns (SELECT *).");
  } else if (/^\s*SELECT/i.test(sql)) {
    sentences.push("Selects specific columns.");
  }

  const joinCount = (upper.match(/\bJOIN\b/g) ?? []).length;
  if (joinCount > 0) {
    sentences.push(`Joins ${joinCount} additional table${joinCount === 1 ? "" : "s"}.`);
  }

  if (/\bWHERE\b/.test(upper)) {
    sentences.push("Filters rows with a WHERE clause.");
  }

  if (/\bGROUP BY\b/.test(upper)) {
    sentences.push("Groups and aggregates rows.");
  }

  if (/\bORDER BY\b/.test(upper)) {
    sentences.push("Sorts the result set.");
  }

  const limitMatch = upper.match(/\bLIMIT\s+(\d+)/);
  if (limitMatch) {
    sentences.push(`Limits the result to ${limitMatch[1]} row(s).`);
  }

  if (sentences.length === 0) {
    sentences.push("Could not determine query structure from keywords.");
  }

  return sentences;
}
