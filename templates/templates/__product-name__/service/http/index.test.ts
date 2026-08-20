import { describe, it, expect } from "vitest";
import { createTemplatesHttpApp } from "@saflib/templates-http/http";

describe("@saflib/templates-http", () => {
  it("should be defined", () => {
    expect(createTemplatesHttpApp).toBeDefined();
  });
});
