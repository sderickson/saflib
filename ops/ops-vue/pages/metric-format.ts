const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

/** 1536 → "1.5 KB" (binary steps, 3 significant digits). */
export function formatBytes(n: number): string {
  let value = n;
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const shown = unit === 0 ? Math.round(value).toLocaleString() : value.toLocaleString(undefined, { maximumSignificantDigits: 3 });
  return `${shown} ${BYTE_UNITS[unit]}`;
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumSignificantDigits: 3 });
}

/**
 * A metric value in its unit: Prometheus names end in their unit, so
 * `*_bytes` metrics read as KB/MB/GB. Bucket bounds come as strings ("+Inf").
 */
export function formatMetricValue(metric: string, n: number | string | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return typeof n === "string" ? n : "—";
  return metric.endsWith("_bytes") ? formatBytes(num) : formatNumber(num);
}
