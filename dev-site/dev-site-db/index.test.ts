import { describe, it, expect } from "vitest";
import { devSiteDbManager } from "@saflib/dev-site-db/instances";

describe("@saflib/dev-site-db", () => {
  it("should be defined", () => {
    expect(devSiteDbManager).toBeDefined();
  });
});
