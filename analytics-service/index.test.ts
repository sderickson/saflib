import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCapture, mockIdentify, mockShutdown, PostHogMock } = vi.hoisted(() => {
  const mockCapture = vi.fn();
  const mockIdentify = vi.fn();
  const mockShutdown = vi.fn();
  const PostHogMock = vi.fn().mockImplementation(() => ({
    capture: mockCapture,
    identify: mockIdentify,
    shutdown: mockShutdown,
  }));
  return { mockCapture, mockIdentify, mockShutdown, PostHogMock };
});

vi.mock("posthog-node", () => ({
  PostHog: PostHogMock,
}));

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
  });

  it("uses in-memory when NODE_ENV is test even if posthog is requested", () => {
    vi.stubEnv("NODE_ENV", "test");
    const svc = createAnalyticsService({
      type: "posthog",
      apiKey: "phc_fake",
      host: "https://example.com",
    });
    svc.capture({ distinctId: "u1", event: "thing_happened", context: { n: 1 } });
    expect(PostHogMock).not.toHaveBeenCalled();
    expect(capturedAnalyticsCalls).toEqual([
      {
        kind: "capture",
        distinctId: "u1",
        event: "thing_happened",
        context: { n: 1 },
      },
    ]);
  });

  it("uses PostHog when not in test and type is posthog", () => {
    vi.stubEnv("NODE_ENV", "development");
    const svc = createAnalyticsService({
      type: "posthog",
      apiKey: "phc_key",
      host: "https://app.posthog.com",
    });
    expect(svc).toBeInstanceOf(PosthogAnalyticsService);
    expect(PostHogMock).toHaveBeenCalledWith("phc_key", {
      host: "https://app.posthog.com",
    });
    svc.capture({ distinctId: "u2", event: "evt", context: { a: true } });
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: "u2",
      event: "evt",
      properties: { a: true },
    });
  });

  it("uses in-memory when type is in-memory and not in test", () => {
    vi.stubEnv("NODE_ENV", "development");
    const svc = createAnalyticsService({ type: "in-memory" });
    svc.capture({ distinctId: "u", event: "e" });
    expect(capturedAnalyticsCalls).toHaveLength(1);
    expect(PostHogMock).not.toHaveBeenCalled();
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
    typed.capture({ distinctId: "d", event: "custom", context: { x: 3 } });
    expect(capturedAnalyticsCalls[0]).toMatchObject({
      kind: "capture",
      event: "custom",
      context: { x: 3 },
    });
  });
});
