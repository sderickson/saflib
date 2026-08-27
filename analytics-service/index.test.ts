import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as node from "@saflib/node";
import {
  clearCapturedAnalyticsCalls,
  capturedAnalyticsCalls,
  createAnalyticsService,
  makeTypedAnalytics,
} from "./index.ts";

describe("createAnalyticsService", () => {
  beforeEach(() => {
    clearCapturedAnalyticsCalls();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    const g = node.getSafContext;
    if (vi.isMockFunction(g)) {
      vi.mocked(g).mockRestore();
    }
  });

  it("uses in-memory when type is in-memory", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(node, "getSafContext").mockReturnValue({
      serviceName: "example-http",
      subsystemName: "http",
      operationName: "op",
      auth: { userId: "u" },
    });
    const svc = createAnalyticsService({ type: "in-memory" });
    svc.capture({ event: "e" });
    expect(capturedAnalyticsCalls).toHaveLength(1);
  });

  it("throws when SafContext has no auth.userId", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(node, "getSafContext").mockReturnValue({
      serviceName: "example-http",
      subsystemName: "http",
      operationName: "op",
    });
    const svc = createAnalyticsService({ type: "in-memory" });
    expect(() => svc.capture({ event: "e" })).toThrow(/auth\.userId/);
  });
});

describe("makeTypedAnalytics", () => {
  beforeEach(() => {
    clearCapturedAnalyticsCalls();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forwards capture with typed events", () => {
    type MyEvent = { event: "custom"; context?: { x: number } };
    const base = createAnalyticsService({ type: "in-memory" });
    const typed = makeTypedAnalytics<MyEvent>(base);
    typed.capture({ event: "custom", context: { x: 3 } });
    expect(capturedAnalyticsCalls[0]).toMatchObject({
      kind: "capture",
      distinctId: "test-user-id",
      event: "custom",
      context: { x: 3 },
    });
  });
});

describe("capture merges ProductEvent envelope org", () => {
  it("includes org in capture properties", () => {
    clearCapturedAnalyticsCalls();
    const svc = createAnalyticsService({ type: "in-memory" });
    svc.capture({
      event: "org_create",
      org: "Og4k_wZ7",
      context: { orgId: "Og4k_wZ7" },
    });
    expect(capturedAnalyticsCalls[0]).toMatchObject({
      kind: "capture",
      event: "org_create",
      context: expect.objectContaining({
        org: "Og4k_wZ7",
        orgId: "Og4k_wZ7",
      }),
    });
  });
});

describe("capture merges SafContext (e.g. host)", () => {
  const safWithHost: node.SafContext = {
    requestId: "r1",
    serviceName: "example-http",
    subsystemName: "http",
    operationName: "PostMatter",
    host: "api.example.com",
    origin: "https://app.example",
    userAgent: "vitest/1",
    clientIp: "203.0.113.1",
    acceptLanguage: "en-US,en;q=0.9",
    auth: { userId: "merge-user" },
  };

  beforeEach(() => {
    clearCapturedAnalyticsCalls();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    const g = node.getSafContext;
    if (vi.isMockFunction(g)) {
      vi.mocked(g).mockRestore();
    }
  });

  it("event context overrides duplicate keys from SafContext merge", () => {
    vi.spyOn(node, "getSafContext").mockReturnValue(safWithHost);
    const svc = createAnalyticsService({ type: "in-memory" });
    svc.capture({ event: "evt", context: { host: "client" } });
    expect(capturedAnalyticsCalls[0]).toMatchObject({
      kind: "capture",
      distinctId: "merge-user",
      context: {
        host: "client",
        origin: "https://app.example",
        user_agent: "vitest/1",
        accept_language: "en-US,en;q=0.9",
      },
    });
  });
});
