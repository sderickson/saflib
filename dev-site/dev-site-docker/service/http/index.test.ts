import { describe, it, expect } from "vitest";
import { startDevSiteService } from "./index.ts";

describe("@saflib/dev-site-docker-http", () => {
  it("re-exports startDevSiteService", () => {
    expect(startDevSiteService).toBeDefined();
  });
});
