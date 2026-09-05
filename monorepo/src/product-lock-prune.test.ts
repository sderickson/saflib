import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import {
  analyzeProductLockPrune,
  applyLockPruneFixes,
  findCompetingDependencies,
  findHoistingHazards,
  findRedundantDependencies,
  hoistMisplacedLockfilePeers,
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

describe("findHoistingHazards", () => {
  it("flags peers that are nested under saflib/node_modules but missing at root", () => {
    vol.fromJSON(
      {
        "/product/node_modules/drizzle-orm/package.json": JSON.stringify({
          name: "drizzle-orm",
          peerDependencies: { "better-sqlite3": ">=7" },
        }),
        "/product/saflib/node_modules/better-sqlite3/package.json":
          JSON.stringify({ name: "better-sqlite3" }),
      },
      "/",
    );

    expect(findHoistingHazards("/product")).toEqual([
      {
        kind: "hoisting-hazard",
        peer: "better-sqlite3",
        requiredBy: "drizzle-orm",
        saflibLockfileKey: "saflib/node_modules/better-sqlite3",
        rootLockfileKey: "node_modules/better-sqlite3",
      },
    ]);
  });

  it("ignores version splits where the same package exists at root", () => {
    vol.fromJSON(
      {
        "/product/node_modules/vite/package.json": JSON.stringify({
          name: "vite",
          version: "6.2.3",
        }),
        "/product/saflib/node_modules/vite/package.json": JSON.stringify({
          name: "vite",
          version: "8.0.13",
        }),
      },
      "/",
    );

    expect(findHoistingHazards("/product")).toEqual([]);
  });
});

describe("findRedundantDependencies", () => {
  it("flags redundant product deps that match saflib-owned versions", () => {
    vol.fromJSON(
      {
        "/product/saflib/sdk/package.json": JSON.stringify({
          name: "@saflib/sdk",
          dependencies: { "openapi-fetch": "^0.17.0" },
        }),
        "/product/package.json": JSON.stringify({
          name: "@product/root",
          devDependencies: {
            "openapi-fetch": "^0.17.0",
          },
        }),
      },
      "/",
    );

    expect(
      findRedundantDependencies("/product", buildPackageIndex("/product")),
    ).toEqual([
      expect.objectContaining({
        kind: "redundant-dependency",
        dependency: "openapi-fetch",
        spec: "^0.17.0",
      }),
    ]);
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

describe("hoistMisplacedLockfilePeers", () => {
  it("moves a nested lockfile entry to the product root", () => {
    const lockfile = {
      packages: {
        "saflib/node_modules/better-sqlite3": {
          version: "12.11.1",
          resolved:
            "https://registry.npmjs.org/better-sqlite3/-/better-sqlite3-12.11.1.tgz",
        },
      },
    };

    const hoisted = hoistMisplacedLockfilePeers(lockfile, [
      {
        kind: "hoisting-hazard",
        peer: "better-sqlite3",
        requiredBy: "drizzle-orm",
        saflibLockfileKey: "saflib/node_modules/better-sqlite3",
        rootLockfileKey: "node_modules/better-sqlite3",
      },
    ]);

    expect(hoisted).toEqual(["better-sqlite3"]);
    const packages = lockfile.packages as Record<string, { version?: string }>;
    expect(packages["node_modules/better-sqlite3"]).toMatchObject({
      version: "12.11.1",
    });
    expect(packages["saflib/node_modules/better-sqlite3"]).toBeUndefined();
  });
});

describe("analyzeProductLockPrune", () => {
  it("collects redundant, competing, hoisting, and stale lockfile issues", () => {
    vol.fromJSON(
      {
        "/product/package.json": JSON.stringify({
          name: "@product/root",
          workspaces: ["saflib/**"],
          devDependencies: {
            "better-sqlite3": "11.8.0",
            vitest: "^3.2.4",
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
          devDependencies: { vitest: "^3.2.4" },
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
      },
      "/",
    );

    const analysis = analyzeProductLockPrune("/product");
    expect(analysis.issues.map((issue) => issue.kind)).toEqual([
      "redundant-dependency",
      "competing-dependency",
      "hoisting-hazard",
      "stale-lockfile",
    ]);
  });
});

describe("applyLockPruneFixes", () => {
  it("removes redundant and competing deps and updates the lockfile", () => {
    vol.fromJSON(
      {
        "/product/package.json": JSON.stringify({
          name: "@product/root",
          devDependencies: {
            "better-sqlite3": "12.11.1",
            vitest: "^3.2.4",
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
            vitest: "^3.2.4",
            "better-sqlite3": "12.11.1",
          },
        }),
        "/product/node_modules/drizzle-orm/package.json": JSON.stringify({
          name: "drizzle-orm",
          peerDependencies: { "better-sqlite3": ">=7" },
        }),
        "/product/saflib/node_modules/better-sqlite3/package.json":
          JSON.stringify({ name: "better-sqlite3" }),
      },
      "/",
    );

    const analysis = analyzeProductLockPrune("/product");
    applyLockPruneFixes(analysis);

    const rootPkg = JSON.parse(
      vol.readFileSync("/product/package.json", "utf8") as string,
    ) as { devDependencies?: Record<string, string> };
    expect(rootPkg.devDependencies?.["better-sqlite3"]).toBeUndefined();
    expect(rootPkg.devDependencies?.vitest).toBeUndefined();

    const lockfile = JSON.parse(
      vol.readFileSync("/product/package-lock.json", "utf8") as string,
    ) as { packages: Record<string, unknown> };
    expect(lockfile.packages["saflib/deleted-pkg"]).toBeUndefined();
    expect(lockfile.packages["node_modules/better-sqlite3"]).toBeDefined();
    expect(lockfile.packages["saflib/node_modules/better-sqlite3"]).toBeUndefined();
  });
});
