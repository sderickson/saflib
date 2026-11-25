import type { OpsDigest } from "@saflib/ops-spec";
import type { DbKey } from "@saflib/drizzle";
import { countActiveUsers } from "@saflib/node-log-db";
import { throwError } from "@saflib/utils";
import { promGet, type OpsMetricsConfig } from "./prometheus.ts";

type DigestActivity = NonNullable<OpsDigest["activity"]>;

const HOUR = 3600;
const MAX_POINTS = 48;

/**
 * User-facing requests: GETs outside the ops, health and metrics routes.
 * Background work (job deliveries, webhooks, scheduled syncs) arrives as
 * POSTs; anyone using the app makes GETs. `unspecified` is unmatched paths
 * (static files, probes).
 */
export const USER_REQUESTS_SELECTOR = `method="GET", path!~"/ops/.*|/health.*|/metrics|unspecified"`;

/** Signed-in users and user-facing requests per hour for the digest window. Never throws. */
export async function digestActivity(
  options: { metrics?: OpsMetricsConfig; logsDbKey?: DbKey },
  since: Date,
  now: Date = new Date(),
): Promise<DigestActivity | null> {
  const { metrics, logsDbKey } = options;
  if (!metrics && !logsDbKey) return null;
  const distinctUsers = logsDbKey
    ? await throwError(countActiveUsers(logsDbKey, since))
    : null;
  if (!metrics)
    return {
      distinct_users: distinctUsers,
      requests_by_hour: null,
      error: null,
    };

  const end = Math.floor(now.getTime() / 1000);
  const start = Math.floor(since.getTime() / 1000);
  // Whole hours, widened so a long window stays at most MAX_POINTS points.
  const step = Math.max(
    HOUR,
    Math.ceil((end - start) / MAX_POINTS / HOUR) * HOUR,
  );
  try {
    const data = (await promGet(
      metrics,
      "/api/v1/query_range",
      new URLSearchParams({
        query: `sum(increase(http_request_duration_seconds_count{${USER_REQUESTS_SELECTOR}}[${step}s]))`,
        start: String(start + step),
        end: String(end),
        step: String(step),
      }),
    )) as { result?: { values?: [number, string][] }[] };
    const values = data.result?.[0]?.values ?? [];
    return {
      distinct_users: distinctUsers,
      // Each point covers the `step` seconds before its timestamp.
      requests_by_hour: values.map(([t, v]) => ({
        start: new Date((t - step) * 1000).toISOString(),
        requests: Math.round(Number(v)),
      })),
      error: null,
    };
  } catch (e) {
    return {
      distinct_users: distinctUsers,
      requests_by_hour: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
