import { describe, it, expect } from "vitest";
import { describeError } from "./describe-error.ts";

describe("describeError", () => {
  it("puts a network cause in the title and the stack", () => {
    const cause = Object.assign(new Error("getaddrinfo ENOTFOUND api.example.com"), { code: "ENOTFOUND", hostname: "api.example.com" });
    const e = new TypeError("fetch failed", { cause });
    e.stack = "TypeError: fetch failed";
    const d = describeError(e);
    expect(d.message).toBe("fetch failed (ENOTFOUND api.example.com)");
    expect(d.stack).toContain("(no stack frames");
    expect(d.stack).toContain("Caused by [ENOTFOUND]: Error: getaddrinfo ENOTFOUND api.example.com");
  });

  it("leaves errors without a cause alone", () => {
    const e = new Error("boom");
    expect(describeError(e)).toEqual({ message: "boom", stack: e.stack });
  });
});
