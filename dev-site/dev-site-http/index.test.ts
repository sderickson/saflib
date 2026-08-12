import { describe, it, expect } from "vitest";
import { createDevSiteHttpApp } from "./http.ts";
import { scanCommits, getCommit, diffCommits } from "./index.ts";

describe("@saflib/dev-site-http", () => {
  it("exports app factory and orchestration entry points", () => {
    expect(createDevSiteHttpApp).toBeDefined();
    expect(scanCommits).toBeDefined();
    expect(getCommit).toBeDefined();
    expect(diffCommits).toBeDefined();
  });
});
