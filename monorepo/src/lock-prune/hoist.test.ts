import { describe, expect, it } from "vitest";
import {
  findHoistingHazards,
  findUnhoistedRegistryDependencies,
  hoistMisplacedLockfilePeers,
  hoistUnhoistedRegistryDependencies,
} from "./hoist.ts";
import { loadProductFixture, useProductFixtureLifecycle } from "./test-helpers.ts";

useProductFixtureLifecycle();

describe("findHoistingHazards", () => {
  it("flags peers that are nested under saflib/node_modules but missing at root", () => {
    const root = loadProductFixture({
      "/product/node_modules/drizzle-orm/package.json": JSON.stringify({
        name: "drizzle-orm",
        peerDependencies: { "better-sqlite3": ">=7" },
      }),
      "/product/saflib/node_modules/better-sqlite3/package.json":
        JSON.stringify({ name: "better-sqlite3" }),
    });

    expect(findHoistingHazards(root)).toEqual([
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
    const root = loadProductFixture({
      "/product/node_modules/vite/package.json": JSON.stringify({
        name: "vite",
        version: "6.2.3",
      }),
      "/product/saflib/node_modules/vite/package.json": JSON.stringify({
        name: "vite",
        version: "8.0.13",
      }),
    });

    expect(findHoistingHazards(root)).toEqual([]);
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

describe("findUnhoistedRegistryDependencies", () => {
  it("flags registry deps locked under saflib workspace paths", () => {
    const lockfile = {
      packages: {
        "saflib/sdk/node_modules/@tanstack/vue-query": {
          version: "5.85.9",
          resolved:
            "https://registry.npmjs.org/@tanstack/vue-query/-/vue-query-5.85.9.tgz",
        },
      },
    };

    expect(findUnhoistedRegistryDependencies(lockfile)).toEqual([
      {
        kind: "unhoisted-registry-dependency",
        dependency: "@tanstack/vue-query",
        nestedLockfileKey: "saflib/sdk/node_modules/@tanstack/vue-query",
        rootLockfileKey: "node_modules/@tanstack/vue-query",
        version: "5.85.9",
      },
    ]);
  });

  it("flags deeply nested saflib workspace lock paths", () => {
    const lockfile = {
      packages: {
        "saflib/dev-site/dev-site-docker/node_modules/vuetify": {
          version: "4.2.0",
        },
      },
    };

    expect(findUnhoistedRegistryDependencies(lockfile)).toEqual([
      {
        kind: "unhoisted-registry-dependency",
        dependency: "vuetify",
        nestedLockfileKey: "saflib/dev-site/dev-site-docker/node_modules/vuetify",
        rootLockfileKey: "node_modules/vuetify",
        version: "4.2.0",
      },
    ]);
  });

  it("skips true dual-installs (platform root + different nested version)", () => {
    const lockfile = {
      packages: {
        "saflib/vitepress/node_modules/esbuild": { version: "0.27.7" },
      },
    };
    const platform = {
      overrides: {},
      resolvedVersions: new Map(),
      lockPackages: {
        "node_modules/esbuild": { version: "0.28.2" },
        "vitepress/node_modules/esbuild": { version: "0.27.7" },
      },
    };

    expect(findUnhoistedRegistryDependencies(lockfile, platform)).toEqual([]);
  });

  it("flags nested-only platform installs (not dual-installs) so they hoist to root", () => {
    const lockfile = {
      packages: {
        "saflib/openapi/node_modules/openapi-typescript": {
          version: "7.13.0",
        },
      },
    };
    const platform = {
      overrides: {},
      resolvedVersions: new Map(),
      lockPackages: {
        // Nested on platform with no root counterpart — phantom dual-install.
        "openapi/node_modules/openapi-typescript": { version: "7.13.0" },
      },
    };

    expect(findUnhoistedRegistryDependencies(lockfile, platform)).toEqual([
      {
        kind: "unhoisted-registry-dependency",
        dependency: "openapi-typescript",
        nestedLockfileKey: "saflib/openapi/node_modules/openapi-typescript",
        rootLockfileKey: "node_modules/openapi-typescript",
        version: "7.13.0",
      },
    ]);
  });
});

describe("hoistUnhoistedRegistryDependencies", () => {
  it("moves nested workspace lock entries to the product root", () => {
    const lockfile = {
      packages: {
        "saflib/sdk/node_modules/@tanstack/vue-query": {
          version: "5.85.9",
        },
      },
    };

    const hoisted = hoistUnhoistedRegistryDependencies(lockfile, [
      {
        kind: "unhoisted-registry-dependency",
        dependency: "@tanstack/vue-query",
        nestedLockfileKey: "saflib/sdk/node_modules/@tanstack/vue-query",
        rootLockfileKey: "node_modules/@tanstack/vue-query",
        version: "5.85.9",
      },
    ]);

    expect(hoisted).toEqual(["@tanstack/vue-query"]);
    const packages = lockfile.packages as Record<string, { version?: string }>;
    expect(packages["node_modules/@tanstack/vue-query"]).toMatchObject({
      version: "5.85.9",
    });
    expect(
      packages["saflib/sdk/node_modules/@tanstack/vue-query"],
    ).toBeUndefined();
  });
});
