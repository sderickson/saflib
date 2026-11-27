import client from "@prometheus-io/client";
import type { OpsDigest } from "@saflib/ops-spec";

type Sample = { value: number; labels: Record<string, string | number | undefined>; metricName?: string };

/**
 * Totals across all label sets of a histogram: request count and, per bucket
 * bound, the cumulative count.
 */
export function histogramTotals(samples: Sample[], name: string) {
  let count = 0;
  const buckets = new Map<number, number>();
  for (const s of samples) {
    if (s.metricName === `${name}_count`) count += s.value;
    if (s.metricName === `${name}_bucket`) {
      const le = s.labels.le === "+Inf" ? Infinity : Number(s.labels.le);
      buckets.set(le, (buckets.get(le) ?? 0) + s.value);
    }
  }
  return { count, buckets };
}

/** Upper bound (ms) of the bucket holding the 95th percentile, or null. */
export function p95UpperMs(count: number, buckets: Map<number, number>): number | null {
  if (count === 0) return null;
  const target = count * 0.95;
  for (const le of [...buckets.keys()].sort((a, b) => a - b)) {
    if ((buckets.get(le) ?? 0) >= target) return Number.isFinite(le) ? le * 1000 : null;
  }
  return null;
}

const HISTOGRAM = "http_request_duration_seconds";

/** This process since it started, from its own metrics (no Prometheus needed). */
export async function processStats(registry: client.Registry = client.register): Promise<OpsDigest["process"]> {
  const startedAt = new Date(Date.now() - process.uptime() * 1000);
  let count = 0;
  let p95: number | null = null;
  const metric = registry.getSingleMetric(HISTOGRAM);
  if (metric) {
    const { values } = await metric.get();
    const totals = histogramTotals(values as Sample[], HISTOGRAM);
    count = totals.count;
    p95 = p95UpperMs(totals.count, totals.buckets);
  }
  return {
    started_at: startedAt.toISOString(),
    requests_total: Math.round(count),
    p95_upper_ms: p95,
    rss_bytes: process.memoryUsage().rss,
  };
}
