import createError from "http-errors";
import { createHandler } from "@saflib/express";
import type { OpsMetricsResult, OpsResponseBody } from "@saflib/ops-spec";
import { opsServiceStorage } from "../context.ts";
import {
  enforceSeriesCap,
  METRICS_LIMITS,
  promGet,
  validateRange,
  toUnixSeconds,
  type OpsMetricsConfig,
} from "../metrics/prometheus.ts";
import { queryDate } from "./_helpers.ts";

function metricsConfig(): OpsMetricsConfig {
  const { metrics } = opsServiceStorage.getStore()!;
  if (!metrics) throw createError(404, "Metrics are not enabled for this product");
  return metrics;
}

interface PromQueryData {
  resultType: OpsMetricsResult["result_type"];
  result: unknown;
}

function mapQueryData(data: unknown): OpsMetricsResult {
  const { resultType, result } = data as PromQueryData;
  // Scalars and strings come back as a bare [time, value] pair.
  const rows = Array.isArray(result) && (resultType === "vector" || resultType === "matrix")
    ? (result as OpsMetricsResult["result"])
    : [{ value: result as unknown[] }];
  if (resultType === "vector" || resultType === "matrix") enforceSeriesCap(rows.length);
  return { result_type: resultType, result: rows };
}

export const queryOpsMetricsHandler = createHandler(async function (req, res) {
  const config = metricsConfig();
  const params = new URLSearchParams({ query: String(req.query.query) });
  const time = queryDate(req.query.time);
  if (time) params.set("time", toUnixSeconds(time));
  const data = await promGet(config, "/api/v1/query", params);
  const response: OpsResponseBody["queryOpsMetrics"][200] = { metrics: mapQueryData(data) };
  res.status(200).json(response);
});

export const queryOpsMetricsRangeHandler = createHandler(async function (req, res) {
  const config = metricsConfig();
  const start = queryDate(req.query.start)!;
  const end = queryDate(req.query.end)!;
  const step = req.query.step === undefined ? 300 : Number(req.query.step);
  validateRange(start.getTime() / 1000, end.getTime() / 1000, step);
  const params = new URLSearchParams({
    query: String(req.query.query),
    start: toUnixSeconds(start),
    end: toUnixSeconds(end),
    step: String(step),
  });
  const data = await promGet(config, "/api/v1/query_range", params);
  const response: OpsResponseBody["queryOpsMetricsRange"][200] = { metrics: mapQueryData(data) };
  res.status(200).json(response);
});

/** `match` values as given: selectors contain commas, so no splitting. */
function matchList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return items.map(String).filter((s) => s.trim() !== "");
}

export const listOpsMetricsSeriesHandler = createHandler(async function (req, res) {
  const config = metricsConfig();
  const matches = matchList(req.query.match);
  if (matches.length === 0) throw createError(400, "At least one match selector is required");
  const end = queryDate(req.query.end) ?? new Date();
  const start = queryDate(req.query.start) ?? new Date(end.getTime() - 3600_000);
  const params = new URLSearchParams({
    start: toUnixSeconds(start),
    end: toUnixSeconds(end),
    limit: String(METRICS_LIMITS.maxSeries + 1),
  });
  for (const m of matches) params.append("match[]", m);
  const data = (await promGet(config, "/api/v1/series", params)) as Record<string, string>[];
  enforceSeriesCap(data.length);
  const response: OpsResponseBody["listOpsMetricsSeries"][200] = { series: data };
  res.status(200).json(response);
});
