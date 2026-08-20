import { describe, it, expect } from "vitest";
import { createBaseHttpApp } from "@saflib/base-http/http";

describe("@saflib/base-http", () => {
  it("should be defined", () => {
    expect(createBaseHttpApp).toBeDefined();
  });
});
