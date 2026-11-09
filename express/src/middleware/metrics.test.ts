import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { setServiceName } from "@saflib/node";
import { metricsMiddleware } from "./metrics.ts";

describe("HTTP metrics", () => {
  it("records standard latency buckets with status classes", async () => {
    setServiceName("metrics-test");
    const app = express();
    app.use(...metricsMiddleware);
    app.get("/ok", (_req, res) => {
      res.status(201).end();
    });
    app.get("/missing", (_req, res) => {
      res.status(404).end();
    });

    await request(app).get("/ok").expect(201);
    await request(app).get("/missing").expect(404);
    const text = (await request(app).get("/metrics").expect(200)).text;

    const buckets = text
      .split("\n")
      .filter((l) => l.startsWith("http_request_duration_seconds_bucket") && l.includes('status_code="2xx"'))
      .map((l) => /le="([^"]+)"/.exec(l)?.[1]);
    expect(buckets).toEqual([
      "0.005", "0.01", "0.025", "0.05", "0.1", "0.25", "0.5", "1", "2.5", "5", "10", "30", "+Inf",
    ]);
    expect(text).toMatch(/status_code="4xx"/);
    expect(text).not.toMatch(/status_code="201"|status_code="404"/);
  });
});
