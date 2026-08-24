import { describe, expect, test } from "vitest";
import {
  cspAllowsDevDevtoolsFraming,
  cspDeniesFraming,
  getContentSecurityPolicy,
  hasBaselineCsp,
  normalizeHeaders,
} from "../../http/headers.ts";

describe("headers", () => {
  test("normalizeHeaders lower-cases keys", () => {
    expect(
      normalizeHeaders({ "X-Content-Type-Options": "nosniff", Server: "hidden" }),
    ).toEqual({
      "x-content-type-options": "nosniff",
      server: "hidden",
    });
  });

  test("normalizeHeaders enables case-insensitive header reads", () => {
    const normalized = normalizeHeaders({
      "Access-Control-Allow-Origin": "https://app.example.test",
    });
    expect(normalized["access-control-allow-origin"]).toBe(
      "https://app.example.test",
    );
  });

  test("csp framing helpers", () => {
    expect(cspDeniesFraming("default-src 'self'; frame-ancestors 'none'")).toBe(
      true,
    );
    expect(cspDeniesFraming("frame-ancestors none")).toBe(true);
    expect(cspDeniesFraming("frame-ancestors 'self'")).toBe(false);

    expect(
      cspAllowsDevDevtoolsFraming(
        "frame-ancestors 'self' http://*.docker.localhost",
      ),
    ).toBe(true);

    expect(hasBaselineCsp("default-src 'self'")).toBe(true);
    expect(hasBaselineCsp("script-src 'self'")).toBe(false);

    expect(
      getContentSecurityPolicy({
        "Content-Security-Policy-Report-Only": "default-src 'self'",
      }),
    ).toBe("default-src 'self'");
  });
});
