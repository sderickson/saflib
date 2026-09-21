import { describe, expect, it } from "vitest";
import { analyzeProductLockPrune } from "./analyze.ts";
import { loadProductFixture, useProductFixtureLifecycle } from "./test-helpers.ts";

useProductFixtureLifecycle();

describe("analyzeProductLockPrune", () => {
  it("collects redundant, competing, hoisting, and stale lockfile issues", () => {
    const root = loadProductFixture({
      "/product/package.json": JSON.stringify({
        name: "@product/root",
        workspaces: ["saflib/**"],
        devDependencies: {
          "better-sqlite3": "11.8.0",
          vitest: "^5.0.0",
        },
      }),
      "/product/package-lock.json": JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "saflib/deleted-pkg": { version: "1.0.0" },
        },
      }),
      "/product/saflib/package.json": JSON.stringify({
        name: "@saflib/saflib",
        devDependencies: { vitest: "^5.0.0" },
      }),
      "/product/saflib/drizzle/package.json": JSON.stringify({
        name: "@saflib/drizzle",
        dependencies: { "better-sqlite3": "12.11.1" },
      }),
      "/product/node_modules/drizzle-orm/package.json": JSON.stringify({
        name: "drizzle-orm",
        peerDependencies: { "better-sqlite3": ">=7" },
      }),
      "/product/saflib/node_modules/better-sqlite3/package.json":
        JSON.stringify({ name: "better-sqlite3" }),
    });

    const analysis = analyzeProductLockPrune(root);
    expect(analysis.issues.map((issue) => issue.kind)).toEqual([
      "redundant-dependency",
      "competing-dependency",
      "hoisting-hazard",
      "stale-lockfile",
    ]);
  });
});
