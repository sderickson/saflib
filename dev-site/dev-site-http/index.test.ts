import { describe, it, expect } from "vitest";
import { createDevSiteHttpApp } from "@saflib/dev-site-http/http";

describe("@saflib/dev-site-http", () => {
  it("should be defined", () => {
    expect(createDevSiteHttpApp).toBeDefined();
  });
});
