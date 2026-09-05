import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import client from "prom-client";
import { metricsMiddleware } from "./metrics.ts";

describe("metricsMiddleware", () => {
  const originalDeployment = process.env.DEPLOYMENT_NAME;

  afterEach(() => {
    if (originalDeployment === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = originalDeployment;
    }
    client.register.clear();
  });

  function makeApp() {
    const app = express();
    app.use(...metricsMiddleware);
    app.get("/health", (_req, res) => {
      res.status(200).end("ok");
    });
    return app;
  }

  it("allows /metrics without forwarded-host in development", async () => {
    process.env.DEPLOYMENT_NAME = "development";
    const res = await request(makeApp()).get("/metrics").expect(200);
    expect(res.text).toContain("# TYPE");
  });

  it("blocks /metrics with forwarded-host outside development", async () => {
    process.env.DEPLOYMENT_NAME = "production";
    await request(makeApp())
      .get("/metrics")
      .set("x-forwarded-host", "api.example.com")
      .expect(403);
  });

  it("allows /metrics with forwarded-host outside development when no header", async () => {
    process.env.DEPLOYMENT_NAME = "production";
    await request(makeApp()).get("/metrics").expect(200);
  });
});
