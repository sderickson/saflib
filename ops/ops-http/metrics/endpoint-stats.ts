import client from "@prometheus-io/client";
import type { OpsDigest } from "@saflib/ops-spec";
import { p95UpperMs } from "./process-stats.ts";
import { promGet, type OpsMetricsConfig } from "./prometheus.ts";

type Endpoints = OpsDigest["endpoints"];
type EndpointStat = NonNullable<Endpoints["slowest"]>;
type Sample = { value: number; labels: Record<string, string | number | undefined>; metricName?: string };

/** Fewer requests than this and a route's numbers are noise. */
export const ENDPOINT_MIN_REQUESTS = 20;

/** Overview thresholds: yellow, then red. */
export const ENDPOINT_THRESHOLDS = {
  p95WarnMs: 1000,
  p95BadMs: 3000,
  availabilityWarnPct: 99.5,
  availabilityBadPct: 99,
} as const;

const HISTOGRAM = "http_request_duration_seconds";
/** Docker's healthcheck and the scrape itself aren't user traffic. */
const IGNORED_PATHS = new Set(["unspecified", "/metrics", "/health"]);

/** Pick the slowest and least available routes from per-route stats. */
export function pickEndpoints(stats: EndpointStat[], source: Endpoints["source"]): Endpoints {
  const judged = stats.filter((s) => s.requests >= ENDPOINT_MIN_REQUESTS && !IGNORED_PATHS.has(s.path));
  const slowest = [...judged].filter((s) => s.p95_ms !== null).sort((a, b) => b.p95_ms! - a.p95_ms! || b.requests - a.requests)[0] ?? null;
  const leastAvailable = [...judged].sort((a, b) => a.availability_pct - b.availability_pct || b.requests - a.requests)[0] ?? null;
  return { source, slowest, least_available: leastAvailable };
}

/** Per-route stats from this process's own histogram, since it started. */
export async function processEndpointStats(registry: client.Registry = client.register): Promise<EndpointStat[]> {
  const metric = registry.getSingleMetric(HISTOGRAM);
  if (!metric) return [];
  const { values } = await metric.get();
  const routes = new Map<string, { method: string; path: string; count: number; errors: number; buckets: Map<number, number> }>();
  for (const s of values as Sample[]) {
    const method = String(s.labels.method ?? "").toUpperCase();
    const path = String(s.labels.path ?? "");
    const key = `${method} ${path}`;
    let r = routes.get(key);
    if (!r) {
      r = { method, path, count: 0, errors: 0, buckets: new Map() };
      routes.set(key, r);
    }
    if (s.metricName === `${HISTOGRAM}_count`) {
      r.count += s.value;
      if (s.labels.status_code === "5xx") r.errors += s.value;
    }
    if (s.metricName === `${HISTOGRAM}_bucket`) {
      const le = s.labels.le === "+Inf" ? Infinity : Number(s.labels.le);
      r.buckets.set(le, (r.buckets.get(le) ?? 0) + s.value);
    }
  }
  return [...routes.values()].map((r) => ({
    method: r.method,
    path: r.path,
    requests: Math.round(r.count),
    p95_ms: p95UpperMs(r.count, r.buckets),
    availability_pct: r.count > 0 ? 100 * (1 - r.errors / r.count) : 100,
  }));
}

type Vector = { metric: Record<string, string>; value: [number, string] }[];

/** Per-route stats over the window from Prometheus. */
export async function prometheusEndpointStats(config: OpsMetricsConfig, since: Date, now = new Date()): Promise<EndpointStat[]> {
  const end = Math.floor(now.getTime() / 1000);
  const w = `${Math.max(300, end - Math.floor(since.getTime() / 1000))}s`;
  const sel = '{path!="unspecified"}';
  const run = async (query: string) =>
    ((await promGet(config, "/api/v1/query", new URLSearchParams({ query, time: String(end) }))) as { result?: Vector }).result ?? [];
  const [counts, errors, p95s] = await Promise.all([
    run(`sum by (method, path) (increase(${HISTOGRAM}_count${sel}[${w}]))`),
    run(`sum by (method, path) (increase(${HISTOGRAM}_count{path!="unspecified",status_code="5xx"}[${w}]))`),
    run(`histogram_quantile(0.95, sum by (le, method, path) (increase(${HISTOGRAM}_bucket${sel}[${w}])))`),
  ]);
  const key = (m: Record<string, string>) => `${(m.method ?? "").toUpperCase()} ${m.path ?? ""}`;
  const errBy = new Map(errors.map((e) => [key(e.metric), Number(e.value[1])]));
  const p95By = new Map(p95s.map((p) => [key(p.metric), Number(p.value[1])]));
  return counts.map((c) => {
    const k = key(c.metric);
    const requests = Number(c.value[1]);
    const errs = errBy.get(k) ?? 0;
    const p95 = p95By.get(k);
    return {
      method: (c.metric.method ?? "").toUpperCase(),
      path: c.metric.path ?? "",
      requests: Math.round(requests),
      p95_ms: p95 !== undefined && Number.isFinite(p95) ? p95 * 1000 : null,
      availability_pct: requests > 0 ? 100 * (1 - errs / requests) : 100,
    };
  });
}

/**
 * The digest's endpoints: Prometheus over the window when it's set up and
 * answering, else this process since it started. Never throws.
 */
export async function digestEndpoints(config: OpsMetricsConfig | null, since: Date): Promise<Endpoints> {
  if (config) {
    try {
      return pickEndpoints(await prometheusEndpointStats(config, since), "prometheus");
    } catch {
      // Fall through to this process's numbers.
    }
  }
  return pickEndpoints(await processEndpointStats(), "process");
}
