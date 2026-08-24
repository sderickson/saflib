import client from "prom-client";
import { createHandler } from "./handler.ts";
import type { MetricsResponseBody } from "@saflib/node-metrics-spec";
import { parsePromText } from "../lib/parsePromText.ts";

export interface GetMetricsSnapshotOptions {
  /** Override for tests; defaults to the global prom-client registry. */
  collectMetrics?: () => Promise<string>;
}

export function createGetMetricsSnapshotHandler(
  options: GetMetricsSnapshotOptions = {},
) {
  const collectMetrics =
    options.collectMetrics ??
    (() => Promise.resolve(client.register.metrics()));

  return createHandler(async (_req, res) => {
    const text = await collectMetrics();
    const metrics = parsePromText(text);
    res
      .status(200)
      .json({ metrics } satisfies MetricsResponseBody["getMetricsSnapshot"][200]);
  });
}
