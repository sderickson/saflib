import createError from "http-errors";

/**
 * Where an app's ops API sends PromQL: the host's prom-label-proxy, which
 * injects `saf_app=~"<app>|host"` into every selector (the `X-Saf-App`
 * header). Queries never go to Prometheus directly.
 */
export interface OpsMetricsConfig {
  /** This app's `saf_app` label (its scrape config sets it). */
  app: string;
  /** Default `PROM_LABEL_PROXY_URL`, else `http://prom-label-proxy:8080`. */
  proxyUrl?: string;
  /** Per-request timeout in ms (default 10s). */
  timeoutMs?: number;
}

export const METRICS_LIMITS = {
  maxRangeSeconds: 31 * 24 * 3600,
  minStepSeconds: 60,
  maxPointsPerSeries: 1500,
  maxSeries: 200,
} as const;

export function resolveProxyUrl(config: OpsMetricsConfig): string {
  return (config.proxyUrl ?? process.env.PROM_LABEL_PROXY_URL ?? "http://prom-label-proxy:8080").replace(
    /\/+$/,
    "",
  );
}

interface PromResponse {
  status?: string;
  data?: unknown;
  errorType?: string;
  error?: string;
}

/**
 * GET a Prometheus HTTP API path through the label proxy. Bad PromQL becomes
 * a 400 with Prometheus's message; anything else going wrong is a 502.
 */
export async function promGet(
  config: OpsMetricsConfig,
  path: string,
  params: URLSearchParams,
): Promise<unknown> {
  const timeoutMs = config.timeoutMs ?? 10_000;
  params.set("timeout", `${Math.max(1, Math.floor(timeoutMs / 1000) - 1)}s`);
  let res: Response;
  try {
    res = await fetch(`${resolveProxyUrl(config)}${path}?${params}`, {
      headers: { "X-Saf-App": `${config.app},host`, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw createError(502, `Prometheus unreachable: ${e instanceof Error ? e.message : String(e)}`);
  }
  let body: PromResponse | undefined;
  try {
    body = (await res.json()) as PromResponse;
  } catch {
    body = undefined;
  }
  if (body?.status === "success") return body.data;
  // bad_data (400) and execution (422) are the caller's query; the rest is ours.
  if (res.status === 400 || res.status === 422) {
    throw createError(400, `PromQL error: ${body?.error ?? `HTTP ${res.status}`}`);
  }
  throw createError(502, `Prometheus error: ${body?.error ?? `HTTP ${res.status}`}`);
}

export function toUnixSeconds(d: Date): string {
  return (d.getTime() / 1000).toString();
}

/** Reject results with too many series, pointing at aggregation. */
export function enforceSeriesCap(count: number): void {
  if (count > METRICS_LIMITS.maxSeries) {
    throw createError(
      400,
      `Query matched more than ${METRICS_LIMITS.maxSeries} series; aggregate it (e.g. sum by (route) (...)) or add label matchers.`,
    );
  }
}

/** Range-query limits (unix seconds); throws a 400 saying how to fix it. */
export function validateRange(start: number, end: number, step: number): void {
  const rangeSeconds = end - start;
  if (rangeSeconds <= 0) throw createError(400, "end must be after start");
  if (rangeSeconds > METRICS_LIMITS.maxRangeSeconds) {
    throw createError(400, "Range is over 31 days (Prometheus keeps 30)");
  }
  if (step < METRICS_LIMITS.minStepSeconds) {
    throw createError(400, "step must be at least 60 seconds (the scrape interval)");
  }
  const points = Math.floor(rangeSeconds / step) + 1;
  if (points > METRICS_LIMITS.maxPointsPerSeries) {
    const minStep = Math.ceil(rangeSeconds / (METRICS_LIMITS.maxPointsPerSeries - 1));
    throw createError(
      400,
      `${points} points per series is over ${METRICS_LIMITS.maxPointsPerSeries}; use step >= ${minStep}`,
    );
  }
}
