import type { OpsDigest } from "@saflib/ops-spec";
import { promGet, type OpsMetricsConfig } from "./prometheus.ts";

type DigestMetrics = NonNullable<OpsDigest["metrics"]>;

/** Thresholds for flagging a window (conservative: a small product's noise shouldn't page). */
export const DIGEST_METRIC_THRESHOLDS = {
  minRequests: 20,
  highErrorRate: 0.05,
  risingErrorRate: 0.01,
  slowP95Seconds: 0.5,
  factor: 2,
} as const;

const MAX_WINDOW_SECONDS = 30 * 24 * 3600;

async function scalar(config: OpsMetricsConfig, query: string, time: number): Promise<number | null> {
  const data = (await promGet(
    config,
    "/api/v1/query",
    new URLSearchParams({ query, time: String(time) }),
  )) as { result?: { value?: [number, string] }[] };
  const raw = data.result?.[0]?.value?.[1];
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Request count, 5xx error rate and p95 latency for the digest window and the
 * window before it, with flags when they look wrong. Never throws: a metrics
 * failure is reported in `error` so the rest of the digest still returns.
 */
export async function digestMetrics(
  config: OpsMetricsConfig,
  since: Date,
  now: Date = new Date(),
): Promise<DigestMetrics> {
  const end = Math.floor(now.getTime() / 1000);
  const window = Math.min(MAX_WINDOW_SECONDS, Math.max(300, end - Math.floor(since.getTime() / 1000)));
  const w = `${window}s`;
  const count = `http_request_duration_seconds_count`;
  const queries = (offset: string) => [
    `sum(increase(${count}[${w}]${offset}))`,
    `sum(increase(${count}{status_code="5xx"}[${w}]${offset}))`,
    `histogram_quantile(0.95, sum by (le) (increase(http_request_duration_seconds_bucket[${w}]${offset})))`,
  ];
  try {
    const [req, err, p95, prevReq, prevErr, prevP95] = await Promise.all(
      [...queries(""), ...queries(` offset ${w}`)].map((q) => scalar(config, q, end)),
    );
    const rate = (r: number | null, e: number | null) => (r && r > 0 ? (e ?? 0) / r : null);
    const errorRate = rate(req, err);
    const prevErrorRate = rate(prevReq, prevErr);

    const t = DIGEST_METRIC_THRESHOLDS;
    const flags: DigestMetrics["flags"] = [];
    const enoughTraffic = (req ?? 0) >= t.minRequests;
    if (enoughTraffic && errorRate !== null && errorRate >= t.highErrorRate) flags.push("error_rate_high");
    if (
      enoughTraffic &&
      errorRate !== null &&
      errorRate >= t.risingErrorRate &&
      errorRate >= t.factor * (prevErrorRate ?? 0) &&
      !flags.includes("error_rate_high")
    ) {
      flags.push("error_rate_up");
    }
    if (p95 !== null && prevP95 !== null && p95 >= t.slowP95Seconds && p95 >= t.factor * prevP95) {
      flags.push("p95_up");
    }

    return {
      window_seconds: window,
      requests: { current: req, previous: prevReq },
      error_rate: { current: errorRate, previous: prevErrorRate },
      p95_seconds: { current: p95, previous: prevP95 },
      flags,
      error: null,
    };
  } catch (e) {
    return {
      window_seconds: window,
      requests: { current: null, previous: null },
      error_rate: { current: null, previous: null },
      p95_seconds: { current: null, previous: null },
      flags: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
