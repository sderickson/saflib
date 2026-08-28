import { describe, it, expect } from "vitest";
import { startDevSiteService } from "./index.ts";

describe("@saflib/base-dev-site-http", () => {
  it("exports startDevSiteService", () => {
    expect(startDevSiteService).toBeDefined();
  });
});
