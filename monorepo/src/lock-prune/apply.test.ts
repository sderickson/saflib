import { describe, expect, it } from "vitest";
import { analyzeProductLockPrune } from "./analyze.ts";
import { applyLockPruneFixes } from "./apply.ts";
import {
  getFixtureRoot,
  loadProductFixture,
  readProductFile,
  useProductFixtureLifecycle,
} from "./test-helpers.ts";

useProductFixtureLifecycle();

describe("applyLockPruneFixes", () => {
  it("removes redundant and competing deps and updates the lockfile", () => {
    loadProductFixture({
      "/product/package.json": JSON.stringify({
        name: "@product/root",
        devDependencies: {
          "better-sqlite3": "12.11.1",
          vitest: "^5.0.0",
        },
      }),
      "/product/package-lock.json": JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "saflib/deleted-pkg": { version: "1.0.0" },
          "saflib/node_modules/better-sqlite3": { version: "12.11.1" },
        },
      }),
      "/product/saflib/package.json": JSON.stringify({
        name: "@saflib/saflib",
        devDependencies: {
          vitest: "^5.0.0",
          "better-sqlite3": "12.11.1",
        },
      }),
      "/product/node_modules/drizzle-orm/package.json": JSON.stringify({
        name: "drizzle-orm",
        peerDependencies: { "better-sqlite3": ">=7" },
      }),
      "/product/saflib/node_modules/better-sqlite3/package.json":
        JSON.stringify({ name: "better-sqlite3" }),
    });

    const analysis = analyzeProductLockPrune(getFixtureRoot());
    applyLockPruneFixes(analysis);

    const rootPkg = JSON.parse(readProductFile("package.json")) as {
      devDependencies?: Record<string, string>;
    };
    expect(rootPkg.devDependencies?.["better-sqlite3"]).toBeUndefined();
    expect(rootPkg.devDependencies?.vitest).toBeUndefined();

    const lockfile = JSON.parse(readProductFile("package-lock.json")) as {
      packages: Record<string, unknown>;
    };
    expect(lockfile.packages["saflib/deleted-pkg"]).toBeUndefined();
    expect(lockfile.packages["node_modules/better-sqlite3"]).toBeDefined();
    expect(
      lockfile.packages["saflib/node_modules/better-sqlite3"],
    ).toBeUndefined();
  });
});
