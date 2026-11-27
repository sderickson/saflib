import client from "@prometheus-io/client";
import type { OpsResponseBody } from "@saflib/ops-spec";

type Summary = OpsResponseBody["getOpsDiagnosticMetrics"][200]["metrics"][number];
type Value = { value: number; labels: Record<string, string | number | undefined>; metricName?: string };
type MetricJson = { name: string; help: string; type: string; values: Value[] };

/** Summarize one metric's samples for the Diagnostics table. */
export function summarizeMetric(m: MetricJson): Summary {
  if (m.type === "histogram") {
    const cumulative = new Map<string, number>();
    let count = 0;
    let sum = 0;
    const seriesKeys = new Set<string>();
    for (const v of m.values) {
      if (v.metricName === `${m.name}_bucket`) {
        const le = String(v.labels.le);
        cumulative.set(le, (cumulative.get(le) ?? 0) + v.value);
        const { le: _le, ...rest } = v.labels;
        seriesKeys.add(JSON.stringify(rest));
      } else if (v.metricName === `${m.name}_count`) count += v.value;
      else if (v.metricName === `${m.name}_sum`) sum += v.value;
    }
    const bounds = [...cumulative.keys()].sort((a, b) => (a === "+Inf" ? 1 : b === "+Inf" ? -1 : Number(a) - Number(b)));
    let prev = 0;
    let p95: string | null = null;
    const buckets = bounds.map((le) => {
      const c = cumulative.get(le)!;
      if (p95 === null && count > 0 && c >= count * 0.95) p95 = le;
      const bucket = { le, count: c - prev };
      prev = c;
      return bucket;
    });
    return { name: m.name, help: m.help, type: m.type, series: seriesKeys.size, total: null, histogram: { buckets, count, sum, p95_le: p95 } };
  }
  const total = m.values.reduce((t, v) => t + (Number.isFinite(v.value) ? v.value : 0), 0);
  return { name: m.name, help: m.help, type: m.type, series: m.values.length, total, histogram: null };
}

/** Every metric on this process's registry (the one /metrics serves). */
export async function metricsSummary(registry: client.Registry = client.register): Promise<Summary[]> {
  const json = (await registry.getMetricsAsJSON()) as unknown as MetricJson[];
  return json.map(summarizeMetric).sort((a, b) => a.name.localeCompare(b.name));
}
