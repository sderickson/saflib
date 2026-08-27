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
  resetAnalyticsForTests,
} from "@saflib/analytics-service";
import {
  configureAnalytics,
  createPosthogAnalyticsService,
  getAnalyticsClient,
  PosthogAnalyticsService,
} from "./index.ts";

describe("PosthogAnalyticsService", () => {
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

  it("captures via posthog-node", () => {
    vi.spyOn(node, "getSafContext").mockReturnValue({
      serviceName: "example-http",
      subsystemName: "http",
      operationName: "op",
      auth: { userId: "u2" },
    });
    const svc = createPosthogAnalyticsService({
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

  it("merges host from getSafContext into PostHog properties", () => {
    vi.spyOn(node, "getSafContext").mockReturnValue({
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
    });
    const svc = createPosthogAnalyticsService({
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
});

describe("configureAnalytics", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    resetAnalyticsForTests();
    clearCapturedAnalyticsCalls();
    PostHogMock.mockClear();
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    resetAnalyticsForTests();
    vi.unstubAllEnvs();
  });

  it("uses in-memory when NODE_ENV is test even if a key is set", () => {
    vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_fake");
    configureAnalytics();
    const client = getAnalyticsClient();
    client.capture({ event: "thing_happened", context: { n: 1 } });
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

  it("uses PostHog when not in test and key is set", () => {
    resetAnalyticsForTests();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_key");
    vi.stubEnv("POSTHOG_PROJECT_HOST", "https://app.posthog.com");
    configureAnalytics();
    expect(getAnalyticsClient()).toBeInstanceOf(PosthogAnalyticsService);
    expect(PostHogMock).toHaveBeenCalledWith("phc_key", {
      host: "https://app.posthog.com",
    });
  });
});
