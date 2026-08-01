import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCapture, mockIdentify, mockShutdown, PostHogMock } = vi.hoisted(
  () => {
    const mockCapture = vi.fn();
    const mockIdentify = vi.fn();
    const mockShutdown = vi.fn();
    const PostHogMock = vi.fn().mockImplementation(() => ({
      capture: mockCapture,
      identify: mockIdentify,
      shutdown: mockShutdown,
    }));
    return { mockCapture, mockIdentify, mockShutdown, PostHogMock };
  },
);

vi.mock("posthog-node", () => ({
  PostHog: PostHogMock,
}));

import * as node from "@saflib/node";
import {
  clearCapturedAnalyticsCalls,
  capturedAnalyticsCalls,
  createAnalyticsService,
  makeTypedAnalytics,
  PosthogAnalyticsService,
} from "./index.ts";

describe("createAnalyticsService", () => {
  beforeEach(() => {
    clearCapturedAnalyticsCalls();
    mockCapture.mockClear();
    mockIdentify.mockClear();
    mockShutdown.mockClear();
    PostHogMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    const g = node.getSafContext;
    if (vi.isMockFunction(g)) {
      vi.mocked(g).mockRestore();
    }
  });

  it("uses in-memory when NODE_ENV is test even if posthog is requested", () => {
    vi.stubEnv("NODE_ENV", "test");
    const svc = createAnalyticsService({
      type: "posthog",
      apiKey: "phc_fake",
      host: "https://example.com",
    });
    svc.capture({ event: "thing_happened", context: { n: 1 } });
    expect(PostHogMock).not.toHaveBeenCalled();
    expect(capturedAnalyticsCalls).toEqual([
      {
        kind: "capture",
        distinctId: "test-user-id",
        event: "thing_happened",
        context: { n: 1 },
      },
    ]);
  });

  it("uses PostHog when not in test and type is posthog", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(node, "getSafContext").mockReturnValue({
      serviceName: "daemon-http",
      subsystemName: "http",
      operationName: "op",
      auth: { userId: "u2" },
    });
    const svc = createAnalyticsService({
      type: "posthog",
      apiKey: "phc_key",
      host: "https://app.posthog.com",
    });
    expect(svc).toBeInstanceOf(PosthogAnalyticsService);
    expect(PostHogMock).toHaveBeenCalledWith("phc_key", {
      host: "https://app.posthog.com",
    });
    svc.capture({ event: "evt", context: { a: true } });
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: "u2",
      event: "evt",
      properties: { a: true },
    });
  });

  it("uses in-memory when type is in-memory and not in test", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(node, "getSafContext").mockReturnValue({
      serviceName: "daemon-http",
      subsystemName: "http",
      operationName: "op",
      auth: { userId: "u" },
    });
    const svc = createAnalyticsService({ type: "in-memory" });
    svc.capture({ event: "e" });
    expect(capturedAnalyticsCalls).toHaveLength(1);
    expect(PostHogMock).not.toHaveBeenCalled();
  });

  it("throws when SafContext has no auth.userId", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(node, "getSafContext").mockReturnValue({
      serviceName: "daemon-http",
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
    serviceName: "daemon-http",
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
    mockCapture.mockClear();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    const g = node.getSafContext;
    if (vi.isMockFunction(g)) {
      vi.mocked(g).mockRestore();
    }
  });

  it("merges host from getSafContext into PostHog properties", () => {
    vi.spyOn(node, "getSafContext").mockReturnValue(safWithHost);
    const svc = createAnalyticsService({
      type: "posthog",
      apiKey: "phc_key",
      host: "https://app.posthog.com",
    });
    svc.capture({ event: "evt", context: { a: 1 } });
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: "merge-user",
      event: "evt",
      properties: {
        host: "api.example.com",
        origin: "https://app.example",
        user_agent: "vitest/1",
        accept_language: "en-US,en;q=0.9",
        a: 1,
      },
    });
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
