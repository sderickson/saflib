import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import {
  createErrorMiddleware,
  createOperationScopedMiddleware,
  makeAdminHeaders,
} from "@saflib/express";
import { operationJsonSpec as getMetricsSnapshotOperationJsonSpec } from "@saflib/node-metrics-spec/operations/getMetricsSnapshot";
import { createGetMetricsSnapshotHandler } from "./get-metrics-snapshot.ts";

const samplePromText = `
# HELP demo_requests_total Demo counter
# TYPE demo_requests_total counter
demo_requests_total{route="home"} 3
`.trim();

describe("createMetricsRouter", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@example.com";
  });

  function makeApp(promText: string = samplePromText) {
    const app = express();
    app.get(
      "/admin/metrics/snapshot",
      ...createOperationScopedMiddleware(getMetricsSnapshotOperationJsonSpec),
      createGetMetricsSnapshotHandler({
        collectMetrics: async () => promText,
      }),
    );
    app.use(createErrorMiddleware());
    return app;
  }

  it("returns parsed metrics for site admins", async () => {
    const res = await request(makeApp())
      .get("/admin/metrics/snapshot")
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
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

  it("returns 403 for non-admin users", async () => {
    await request(makeApp())
      .get("/admin/metrics/snapshot")
      .set({
        "x-user-id": "user-1",
        "x-user-email": "user@example.com",
        "x-user-email-verified": "true",
        "x-user-is-admin": "false",
        "x-user-mfa-completed": "true",
        "x-requested-with": "XMLHttpRequest",
      })
      .expect(403);
  });
});
