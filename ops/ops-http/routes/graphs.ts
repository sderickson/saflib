import createError from "http-errors";
import { createHandler } from "@saflib/express";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { findActiveGraphKey, getOrCreateSigningKey } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createFixedWindowLimiter } from "../auth/rate-limit.ts";
import { opsServiceStorage } from "../context.ts";
import { renderGraphSvg, type GraphSeries } from "../graphs/render-svg.ts";
import { svgToPng } from "../graphs/render-png.ts";
import {
  graphLinkQuery,
  signGraphParams,
  verifyGraphSignature,
  type GraphLinkParams,
} from "../graphs/signing.ts";
import { enforceSeriesCap, promGet, validateRange } from "../metrics/prometheus.ts";

/** Graph images are public (signed), so cap renders per IP. */
const imageLimiter = createFixedWindowLimiter({ limit: 60, windowMs: 60_000 });

function metricsConfig() {
  const { metrics } = opsServiceStorage.getStore()!;
  if (!metrics) throw createError(404, "Metrics are not enabled for this product");
  return metrics;
}

/** A step giving about 300 points, rounded to whole minutes. */
function defaultStep(rangeSeconds: number): number {
  return Math.max(60, Math.ceil(rangeSeconds / 300 / 60) * 60);
}

export const createOpsGraphLinkHandler = createHandler(async function (req, res) {
  metricsConfig();
  const { dbKey } = opsServiceStorage.getStore()!;
  const body = req.body as {
    query: string;
    start?: string;
    end?: string;
    step?: number;
    width?: number;
    height?: number;
    title?: string;
  };
  const end = Math.floor((body.end ? new Date(body.end) : new Date()).getTime() / 1000);
  const start = body.start ? Math.floor(new Date(body.start).getTime() / 1000) : end - 24 * 3600;
  const step = body.step ?? defaultStep(end - start);
  validateRange(start, end, step);
  const params: GraphLinkParams = {
    q: body.query,
    start,
    end,
    step,
    w: body.width ?? 720,
    h: body.height ?? 320,
    title: body.title ?? "",
  };
  const key = await throwError(getOrCreateSigningKey(dbKey));
  const query = graphLinkQuery(params, key.id, signGraphParams(params, key.id, key.secret));
  const base = `${req.protocol}://${req.get("host")}`;
  const response: OpsResponseBody["createOpsGraphLink"][200] = {
    graph_link: {
      svg_url: `${base}/ops/metrics/graph.svg?${query}`,
      png_url: `${base}/ops/metrics/graph.png?${query}`,
      start: new Date(start * 1000).toISOString(),
      end: new Date(end * 1000).toISOString(),
      step,
    },
  };
  res.status(200).json(response);
});

async function renderSignedGraph(query: Record<string, unknown>, ip: string): Promise<string> {
  const config = metricsConfig();
  if (!imageLimiter.hit(ip)) throw createError(429, "Too many graph requests");
  const { dbKey } = opsServiceStorage.getStore()!;
  const params: GraphLinkParams = {
    q: String(query.q),
    start: Number(query.start),
    end: Number(query.end),
    step: Number(query.step),
    w: Number(query.w),
    h: Number(query.h),
    title: query.title === undefined ? "" : String(query.title),
  };
  const kid = String(query.kid);
  const key = await throwError(findActiveGraphKey(dbKey, kid));
  if (!key || !verifyGraphSignature(params, kid, key.secret, String(query.sig))) {
    throw createError(403, "Invalid or revoked graph link");
  }
  validateRange(params.start, params.end, params.step);
  const data = (await promGet(
    config,
    "/api/v1/query_range",
    new URLSearchParams({
      query: params.q,
      start: String(params.start),
      end: String(params.end),
      step: String(params.step),
    }),
  )) as { result: GraphSeries[] };
  const series = Array.isArray(data.result) ? data.result : [];
  enforceSeriesCap(series.length);
  return renderGraphSvg({
    series,
    start: params.start,
    end: params.end,
    width: params.w,
    height: params.h,
    title: params.title || undefined,
  });
}

/** Signed links always show the same graph, so caches may keep them. */
const IMMUTABLE = "public, max-age=31536000, immutable";

export const getOpsGraphSvgHandler = createHandler(async function (req, res) {
  const svg = await renderSignedGraph(req.query, req.ip ?? "unknown");
  res
    .status(200)
    .set("Content-Type", "image/svg+xml; charset=utf-8")
    .set("Cache-Control", IMMUTABLE)
    // The SVG is ours, but keep it inert if opened directly.
    .set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
    .send(svg);
});

export const getOpsGraphPngHandler = createHandler(async function (req, res) {
  const svg = await renderSignedGraph(req.query, req.ip ?? "unknown");
  res.status(200).set("Content-Type", "image/png").set("Cache-Control", IMMUTABLE).send(svgToPng(svg));
});
