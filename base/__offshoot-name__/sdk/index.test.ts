import { describe, it, expect } from "vitest";
import { __offshootName__FakeHandlers } from "./fakes.ts";

describe("@saflib/base-__offshoot-name__-sdk", () => {
  it("exports fake handlers array", () => {
    expect(Array.isArray(__offshootName__FakeHandlers)).toBe(true);
  });
});
