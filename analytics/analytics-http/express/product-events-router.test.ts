import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createErrorMiddleware } from "@saflib/express";
import type { AnalyticsService } from "@saflib/analytics-service";
import { createProductEventsRouter, type ProductEventsRouterOptions } from "./product-events-router.ts";

const signedIn = {
  "x-requested-with": "XMLHttpRequest",
  "x-user-id": "u1",
  "x-user-email": "u1@example.com",
  "x-user-email-verified": "true",
} as const;

function setup(options: ProductEventsRouterOptions = {}) {
  const analytics = { capture: vi.fn(), captureAnonymous: vi.fn(), identify: vi.fn(), shutdown: vi.fn() };
  const app = express();
  app.use(express.json());
  app.use(createProductEventsRouter({ allowedEvents: ["signup.started", "matter.viewed"], getAnalytics: () => analytics as AnalyticsService, ...options }));
  app.use(createErrorMiddleware());
  return { app, analytics };
}

const post = (app: express.Express, body: object, headers: Record<string, string> = { "x-requested-with": "XMLHttpRequest" }) =>
  request(app).post("/product-events").set(headers).send(body);

describe("POST /product-events", () => {
  it("records signed-in events as the user and others anonymously", async () => {
    const { app, analytics } = setup();
    await post(app, { product_event: { event: "matter.viewed", context: { tab: "files" } } }, signedIn).expect(204);
    await post(app, { product_event: { event: "signup.started" } }).expect(204);
    expect(analytics.capture).toHaveBeenCalledWith({ event: "matter.viewed", context: { tab: "files" } });
    expect(analytics.captureAnonymous).toHaveBeenCalledWith({ event: "signup.started" });
  });

  it("rejects unknown names, malformed bodies and oversized properties", async () => {
    const { app, analytics } = setup();
    await post(app, { product_event: { event: "made.up" } }).expect(400);
    await post(app, { product_event: { event: "<script>" } }).expect(400);
    await post(app, { product_event: { event: "signup.started", extra: 1 } }).expect(400);
    await post(app, { product_event: { event: "signup.started", context: { blob: "x".repeat(3000) } } }).expect(400);
    expect(analytics.captureAnonymous).not.toHaveBeenCalled();
  });

  it("rate limits per IP and for all anonymous traffic, separately from signed-in users", async () => {
    const { app, analytics } = setup({ limits: { perIp: 2, anonymous: 100, perUser: 1 } });
    const ev = { product_event: { event: "signup.started" } };
    await post(app, ev).expect(204);
    await post(app, ev).expect(204);
    await post(app, ev).expect(429);
    await post(app, ev, signedIn).expect(204);
    await post(app, ev, signedIn).expect(429);
    expect(analytics.captureAnonymous).toHaveBeenCalledTimes(2);
    expect(analytics.capture).toHaveBeenCalledTimes(1);
  });
});
