import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { isPublicMonolithRoute } from "../app/is-public-monolith-route.ts";

function req(method: string, path: string): Request {
  return { method, path } as Request;
}

describe("isPublicMonolithRoute", () => {
  it("allows CSP violation POST/OPTIONS", () => {
    expect(isPublicMonolithRoute(req("POST", "/csp-violations"))).toBe(true);
    expect(isPublicMonolithRoute(req("OPTIONS", "/csp-violations"))).toBe(true);
    expect(isPublicMonolithRoute(req("GET", "/csp-violations"))).toBe(false);
  });

  it("allows marketing unsubscribe POST", () => {
    expect(
      isPublicMonolithRoute(req("POST", "/user-configs/unsubscribe-marketing")),
    ).toBe(true);
  });

  it("allows health, dev logs, and dev observability GET", () => {
    expect(isPublicMonolithRoute(req("GET", "/health"))).toBe(true);
    expect(isPublicMonolithRoute(req("GET", "/dev/logs"))).toBe(true);
    expect(isPublicMonolithRoute(req("GET", "/dev/logs/stream"))).toBe(true);
    expect(isPublicMonolithRoute(req("GET", "/email/sent"))).toBe(true);
    expect(isPublicMonolithRoute(req("GET", "/admin/metrics/snapshot"))).toBe(
      true,
    );
    expect(isPublicMonolithRoute(req("GET", "/admin/product-events"))).toBe(
      true,
    );
    expect(isPublicMonolithRoute(req("GET", "/admin/errors"))).toBe(true);
  });

  it("denies authenticated product routes", () => {
    expect(isPublicMonolithRoute(req("GET", "/user-configs/mine"))).toBe(
      false,
    );
    expect(isPublicMonolithRoute(req("PUT", "/user-configs/mine"))).toBe(
      false,
    );
  });
});
