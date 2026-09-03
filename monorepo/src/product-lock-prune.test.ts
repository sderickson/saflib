import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import {
  analyzeProductLockPrune,
  applyLockPruneFixes,
  findCompetingDependencies,
  inspectSaflibNodeModules,
  pruneStaleLockfileEntries,
} from "./product-lock-prune.ts";
import { buildPackageIndex } from "@saflib/imports";

vi.mock("node:fs");
vi.mock("node:fs/promises");

beforeEach(() => {
  vol.reset();
});

afterEach(() => {
  vol.reset();
});

describe("inspectSaflibNodeModules", () => {
  it("returns null when saflib/node_modules is absent", () => {
    expect(inspectSaflibNodeModules("/product/saflib")).toBeNull();
  });

  it("ignores cache-only directories", () => {
    vol.fromJSON(
      {
        "/product/saflib/node_modules/.cache/foo": "",
        "/product/saflib/node_modules/.vite-temp/bar": "",
      },
      "/",
    );
    expect(inspectSaflibNodeModules("/product/saflib")).toBeNull();
  });

  it("reports installed packages under saflib/node_modules", () => {
    vol.fromJSON(
      {
        "/product/saflib/node_modules/better-sqlite3/package.json":
          JSON.stringify({ name: "better-sqlite3" }),
        "/product/saflib/node_modules/@scope/pkg/package.json": JSON.stringify({
          name: "@scope/pkg",
        }),
      },
      "/",
    );
    expect(inspectSaflibNodeModules("/product/saflib")).toEqual({
      kind: "saflib-node-modules",
      path: "/product/saflib/node_modules",
      packages: ["@scope/pkg", "better-sqlite3"],
    });
  });
});

describe("findCompetingDependencies", () => {
  it("flags product deps that compete with saflib-owned versions", () => {
    vol.fromJSON(
      {
        "/product/saflib/sdk/package.json": JSON.stringify({
          name: "@saflib/sdk",
          dependencies: { "openapi-fetch": "^0.17.0" },
        }),
        "/product/package.json": JSON.stringify({
          name: "@product/root",
          devDependencies: {
            "openapi-fetch": "^0.14.0",
            "@saflib/vue": "*",
          },
        }),
      },
      "/",
    );

    const issues = findCompetingDependencies(
      "/product",
      buildPackageIndex("/product"),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      dependency: "openapi-fetch",
      productSpec: "^0.14.0",
      saflibSpecs: ["^0.17.0"],
    });
  });

  it("allows product declarations that defer with *", () => {
    vol.fromJSON(
      {
        "/product/saflib/sdk/package.json": JSON.stringify({
          name: "@saflib/sdk",
          dependencies: { "openapi-fetch": "^0.17.0" },
        }),
        "/product/package.json": JSON.stringify({
          name: "@product/root",
          devDependencies: {
            "openapi-fetch": "*",
          },
        }),
      },
      "/",
    );

    expect(
      findCompetingDependencies("/product", buildPackageIndex("/product")),
    ).toEqual([]);
  });
});

describe("pruneStaleLockfileEntries", () => {
  it("removes stale workspace entries and descendants", () => {
    const lockfile = {
      packages: {
        "saflib/deleted-pkg": { version: "1.0.0" },
        "saflib/deleted-pkg/node_modules/foo": { version: "1.0.0" },
        "node_modules/@saflib/deleted": {
          link: true,
          resolved: "saflib/deleted-pkg",
        },
        "saflib/sdk": { version: "1.0.0" },
      },
    };

    vol.fromJSON(
      {
        "/product/saflib/sdk/package.json": JSON.stringify({
          name: "@saflib/sdk",
        }),
      },
      "/",
    );

    const issue = pruneStaleLockfileEntries(lockfile, "/product");
    expect(issue?.stalePaths).toEqual(["saflib/deleted-pkg"]);
    expect(issue?.removedCount).toBe(3);
    expect(lockfile.packages).toEqual({
      "saflib/sdk": { version: "1.0.0" },
    });
  });
});

describe("analyzeProductLockPrune", () => {
  it("collects all issue kinds for an unhealthy product workspace", () => {
    vol.fromJSON(
      {
        "/product/package.json": JSON.stringify({
          name: "@product/root",
          workspaces: ["saflib/**"],
          devDependencies: {
            "better-sqlite3": "11.8.0",
          },
        }),
        "/product/package-lock.json": JSON.stringify({
          lockfileVersion: 3,
          packages: {
            "saflib/deleted-pkg": { version: "1.0.0" },
            "saflib/drizzle/package.json": { version: "1.0.0" },
          },
        }),
        "/product/saflib/package.json": JSON.stringify({
          name: "@saflib/saflib",
        }),
        "/product/saflib/drizzle/package.json": JSON.stringify({
          name: "@saflib/drizzle",
          dependencies: { "better-sqlite3": "12.11.1" },
        }),
        "/product/saflib/node_modules/vite/package.json": JSON.stringify({
          name: "vite",
        }),
      },
      "/",
    );

    const analysis = analyzeProductLockPrune("/product");
    expect(analysis.issues.map((issue) => issue.kind)).toEqual([
      "saflib-node-modules",
      "competing-dependency",
      "stale-lockfile",
    ]);
  });
});

describe("applyLockPruneFixes", () => {
  it("removes competing deps, saflib node_modules, and stale lockfile entries", () => {
    vol.fromJSON(
      {
        "/product/package.json": JSON.stringify({
          name: "@product/root",
          devDependencies: {
            "better-sqlite3": "11.8.0",
          },
        }),
        "/product/package-lock.json": JSON.stringify({
          lockfileVersion: 3,
          packages: {
            "saflib/deleted-pkg": { version: "1.0.0" },
            "saflib/drizzle": { version: "1.0.0" },
          },
        }),
        "/product/saflib/package.json": JSON.stringify({
          name: "@saflib/saflib",
        }),
        "/product/saflib/drizzle/package.json": JSON.stringify({
          name: "@saflib/drizzle",
          dependencies: { "better-sqlite3": "12.11.1" },
        }),
        "/product/saflib/node_modules/vite/package.json": JSON.stringify({
          name: "vite",
        }),
      },
      "/",
    );

    const analysis = analyzeProductLockPrune("/product");
    applyLockPruneFixes(analysis);

    const rootPkg = JSON.parse(
      vol.readFileSync("/product/package.json", "utf8") as string,
    ) as { devDependencies?: Record<string, string> };
    expect(rootPkg.devDependencies?.["better-sqlite3"]).toBeUndefined();
    expect(vol.existsSync("/product/saflib/node_modules")).toBe(false);

    const lockfile = JSON.parse(
      vol.readFileSync("/product/package-lock.json", "utf8") as string,
    ) as { packages: Record<string, unknown> };
    expect(lockfile.packages["saflib/deleted-pkg"]).toBeUndefined();
    expect(lockfile.packages["saflib/drizzle"]).toBeDefined();
  });
});
