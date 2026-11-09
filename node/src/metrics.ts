import client from "prom-client";
import { getServiceName } from "./context.ts";

const collectDefaultMetrics = client.collectDefaultMetrics;

/**
 * Call when the application starts. Calls [prom-client](https://www.npmjs.com/package/prom-client)'s collectDefaultMetrics function under the hood.
 */
export function collectSystemMetrics() {
  collectDefaultMetrics({
    labels: {
      service_name: getServiceName(),
    },
  });
}

/**
 * Standard latency buckets (seconds), roughly 1-2.5-5 steps from 5ms to 30s.
 * Fine enough for a meaningful p95; status codes are grouped into classes
 * (see {@link statusClass}) to pay for the extra series.
 */
export const latencyBuckets = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30,
];

/** @deprecated Use {@link latencyBuckets}. Kept as an alias for existing imports. */
export const metricHistogramDefaultBuckets = latencyBuckets;

/** HTTP status class label value: 200 → "2xx". */
export function statusClass(status: number): string {
  return Number.isInteger(status) && status >= 100 && status < 600
    ? `${Math.floor(status / 100)}xx`
    : "unknown";
}

let dbQueryHistogram: client.Histogram<"service_name" | "outcome"> | undefined;

function serviceNameOrUnknown(): string {
  try {
    return getServiceName();
  } catch {
    return "unknown";
  }
}

/**
 * Record one database query's duration (`db_query_duration_seconds`), by
 * service and outcome (`ok` / `error`). `@saflib/drizzle`'s `queryWrapper`
 * calls this for every wrapped query.
 */
export function observeDbQuery(seconds: number, outcome: "ok" | "error"): void {
  dbQueryHistogram ??=
    (client.register.getSingleMetric("db_query_duration_seconds") as
      | client.Histogram<"service_name" | "outcome">
      | undefined) ??
    new client.Histogram({
      name: "db_query_duration_seconds",
      help: "Duration of database queries run through queryWrapper",
      labelNames: ["service_name", "outcome"],
      buckets: latencyBuckets,
    });
  dbQueryHistogram.observe({ service_name: serviceNameOrUnknown(), outcome }, seconds);
}
