export function formatNumber(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatMs(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value < 1) return `${(value * 1000).toFixed(0)}µs`;
  if (value < 1000) return `${value.toFixed(1)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}
