import { describe, it, expect } from "vitest";
import { baseHandler } from "./typed-fake.ts";

describe("@saflib/base-__offshoot-name__-sdk", () => {
  it("exports typed fake base handler", () => {
    expect(baseHandler).toBeDefined();
  });
});
