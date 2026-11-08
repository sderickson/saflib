import { describe, expect, it } from "vitest";
import { createFixedWindowLimiter } from "./rate-limit.ts";

describe("createFixedWindowLimiter", () => {
  it("allows up to the limit per window, then resets", () => {
    let t = 0;
    const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 1000, now: () => t });
    expect(limiter.hit("a")).toBe(true);
    expect(limiter.blocked("a")).toBe(false);
    expect(limiter.hit("a")).toBe(true);
    expect(limiter.blocked("a")).toBe(true);
    expect(limiter.hit("a")).toBe(false);
    expect(limiter.hit("b")).toBe(true);
    expect(limiter.retryAfterSeconds("a")).toBe(1);
    t = 1000;
    expect(limiter.blocked("a")).toBe(false);
    expect(limiter.hit("a")).toBe(true);
  });
});
