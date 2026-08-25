import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import {
  createErrorMiddleware,
  createOperationScopedMiddleware,
} from "@saflib/express";
import { operationJsonSpec as getMetricsSnapshotOperationJsonSpec } from "@saflib/node-metrics-spec/operations/getMetricsSnapshot";
import { createGetMetricsSnapshotHandler } from "./get-metrics-snapshot.ts";

const samplePromText = `
# HELP demo_requests_total Demo counter
# TYPE demo_requests_total counter
demo_requests_total{route="home"} 3
`.trim();

describe("createMetricsRouter", () => {
  function makeApp(promText: string = samplePromText) {
    const app = express();
    app.get(
      "/admin/metrics/snapshot",
      ...createOperationScopedMiddleware(getMetricsSnapshotOperationJsonSpec, {
        enforceAuth: false,
      }),
      createGetMetricsSnapshotHandler({
        collectMetrics: async () => promText,
      }),
    );
    app.use(createErrorMiddleware());
    return app;
  }

  it("returns parsed metrics without auth", async () => {
    const res = await request(makeApp())
      .get("/admin/metrics/snapshot")
      .set("x-requested-with", "XMLHttpRequest")
      .expect(200);

    expect(res.body.metrics).toEqual([
      {
        name: "demo_requests_total",
        type: "counter",
        help: "Demo counter",
        labels: { route: "home" },
        value: 3,
      },
    ]);
  });
});
