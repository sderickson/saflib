import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  alignRootLockfileWithPlatform,
  analyzeProductLockPrune,
  applyLockPruneFixes,
  findCompetingDependencies,
  findHoistingHazards,
  findLockfileVersionSkew,
  findRedundantDependencies,
  findRootLockfileVersionSkew,
  findUnhoistedRegistryDependencies,
  hoistMisplacedLockfilePeers,
  hoistUnhoistedRegistryDependencies,
  isEmbeddedProductMonorepo,
  pruneStaleLockfileEntries,
  readPlatformContract,
  syncPlatformOverrides,
} from "./product-lock-prune.ts";
import { buildPackageIndex } from "@saflib/imports";
import {
  createFixtureRoot,
  removeFixtureRoot,
  writeFixtureTree,
} from "./test-fixtures/fs-fixture.ts";

let fixtureRoot = "";

function loadProductFixture(files: Record<string, string>): string {
  if (fixtureRoot) {
    removeFixtureRoot(fixtureRoot);
  }
  fixtureRoot = createFixtureRoot("lock-prune");
  writeFixtureTree(fixtureRoot, files, "/product");
  return fixtureRoot;
}

function readProductFile(relativePath: string): string {
  return readFileSync(join(fixtureRoot, relativePath), "utf8");
}

beforeEach(() => {
  fixtureRoot = createFixtureRoot("lock-prune-empty");
});

afterEach(() => {
  if (fixtureRoot) {
    removeFixtureRoot(fixtureRoot);
    fixtureRoot = "";
  }
});

describe("isEmbeddedProductMonorepo", () => {
  it("is true when saflib/package.json exists under the root", () => {
    const root = loadProductFixture({
      "/product/saflib/package.json": JSON.stringify({ name: "@saflib/saflib" }),
    });
    expect(isEmbeddedProductMonorepo(root)).toBe(true);
  });

  it("is false for standalone saflib repos without a nested saflib/ workspace", () => {
    const root = createFixtureRoot("lock-prune-standalone");
    writeFixtureTree(
      root,
      {
        "/standalone/package.json": JSON.stringify({ name: "@saflib/saflib" }),
      },
      "/standalone",
    );
    expect(isEmbeddedProductMonorepo(root)).toBe(false);
    removeFixtureRoot(root);
  });
});

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

describe("findRedundantDependencies", () => {
  it("flags redundant product deps that match saflib-owned versions", () => {
    const root = loadProductFixture({
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
    });

    expect(findRedundantDependencies(root, buildPackageIndex(root))).toEqual([
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
    const root = loadProductFixture({
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
    });

    const issues = findCompetingDependencies(root, buildPackageIndex(root));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      dependency: "openapi-fetch",
      productSpec: "^0.14.0",
      saflibSpecs: ["^0.17.0"],
    });
  });

  it("allows product declarations that defer with *", () => {
    const root = loadProductFixture({
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
    });

    expect(findCompetingDependencies(root, buildPackageIndex(root))).toEqual([]);
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

    const root = loadProductFixture({
      "/product/saflib/sdk/package.json": JSON.stringify({
        name: "@saflib/sdk",
      }),
    });

    const issue = pruneStaleLockfileEntries(lockfile, root);
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

describe("findLockfileVersionSkew", () => {
  it("flags product lock versions that differ from saflib", () => {
    const lockfile = {
      packages: {
        "saflib/sdk/node_modules/@tanstack/vue-query": {
          version: "5.102.8",
        },
      },
    };
    const platform = {
      overrides: {},
      resolvedVersions: new Map([["@tanstack/vue-query", "5.85.9"]]),
      lockPackages: {},
    };

    expect(findLockfileVersionSkew(lockfile, platform)).toEqual([
      {
        kind: "lockfile-version-skew",
        dependency: "@tanstack/vue-query",
        productLockfileKey: "saflib/sdk/node_modules/@tanstack/vue-query",
        productVersion: "5.102.8",
        platformVersion: "5.85.9",
      },
    ]);
  });
});

describe("findRootLockfileVersionSkew", () => {
  it("flags override-pinned root packages that differ from the platform lock", () => {
    const lockfile = {
      packages: {
        "node_modules/vite": { version: "8.3.0" },
        "saflib/node_modules/vite": { version: "8.0.13" },
      },
    };
    const platform = {
      overrides: { vite: "8.0.13" },
      resolvedVersions: new Map([["vite", "8.0.13"]]),
      lockPackages: {
        "node_modules/vite": {
          version: "8.0.13",
          resolved: "https://registry.npmjs.org/vite/-/vite-8.0.13.tgz",
        },
        "node_modules/vite/node_modules/rolldown": { version: "1.0.1" },
      },
    };

    expect(findRootLockfileVersionSkew(lockfile, platform)).toEqual([
      {
        kind: "root-lockfile-version-skew",
        dependency: "vite",
        productLockfileKey: "node_modules/vite",
        productVersion: "8.3.0",
        platformVersion: "8.0.13",
      },
    ]);
  });

  it("flags missing root entries for override pins present in the platform lock", () => {
    const lockfile = { packages: {} };
    const platform = {
      overrides: { vite: "8.0.13" },
      resolvedVersions: new Map([["vite", "8.0.13"]]),
      lockPackages: {
        "node_modules/vite": { version: "8.0.13" },
      },
    };

    expect(findRootLockfileVersionSkew(lockfile, platform)).toEqual([
      {
        kind: "root-lockfile-version-skew",
        dependency: "vite",
        productLockfileKey: "node_modules/vite",
        productVersion: "(missing)",
        platformVersion: "8.0.13",
      },
    ]);
  });
});

describe("alignRootLockfileWithPlatform", () => {
  it("replaces the root tree from the platform lock and drops nested saflib copies", () => {
    const productLockfile = {
      packages: {
        "node_modules/vite": { version: "8.3.0", dependencies: { rolldown: "1.2.6" } },
        "node_modules/rolldown": { version: "1.2.6" },
        "saflib/node_modules/vite": { version: "8.0.13" },
        "saflib/vite/node_modules/vite": { version: "8.0.13" },
      },
    };
    const platform = {
      overrides: { vite: "8.0.13" },
      resolvedVersions: new Map([
        ["vite", "8.0.13"],
        ["rolldown", "1.0.1"],
      ]),
      lockPackages: {
        "node_modules/vite": {
          version: "8.0.13",
          resolved: "https://registry.npmjs.org/vite/-/vite-8.0.13.tgz",
          dependencies: { rolldown: "1.0.1" },
        },
        "node_modules/rolldown": {
          version: "1.0.1",
          resolved: "https://registry.npmjs.org/rolldown/-/rolldown-1.0.1.tgz",
        },
      },
    };

    const fixed = alignRootLockfileWithPlatform(productLockfile, platform, [
      {
        kind: "root-lockfile-version-skew",
        dependency: "vite",
        productLockfileKey: "node_modules/vite",
        productVersion: "8.3.0",
        platformVersion: "8.0.13",
      },
    ]);

    expect(fixed).toEqual(["rolldown", "vite"]);
    const packages = productLockfile.packages as Record<
      string,
      { version?: string; resolved?: string }
    >;
    expect(packages["node_modules/vite"]).toMatchObject({
      version: "8.0.13",
      resolved: "https://registry.npmjs.org/vite/-/vite-8.0.13.tgz",
    });
    expect(packages["node_modules/rolldown"]).toMatchObject({
      version: "1.0.1",
    });
    expect(packages["saflib/node_modules/vite"]).toBeUndefined();
    expect(packages["saflib/vite/node_modules/vite"]).toBeUndefined();
  });
});

describe("syncPlatformOverrides", () => {
  it("merges saflib overrides into the product root package.json", () => {
    const root = loadProductFixture({
      "/product/package.json": JSON.stringify({
        name: "@product/root",
        overrides: { "better-sqlite3": "12.11.1" },
      }),
      "/product/saflib/package.json": JSON.stringify({
        name: "@saflib/saflib",
        overrides: {
          vue: "3.5.20",
          vite: "8.0.13",
          "better-sqlite3": "12.11.1",
        },
      }),
    });

    const platform = readPlatformContract(root);
    expect(syncPlatformOverrides(root, platform)).toEqual([
      "vue@3.5.20",
      "vite@8.0.13",
    ]);

    const rootPkg = JSON.parse(readProductFile("package.json")) as {
      overrides: Record<string, string>;
    };
    expect(rootPkg.overrides).toEqual({
      "better-sqlite3": "12.11.1",
      vue: "3.5.20",
      vite: "8.0.13",
    });
  });
});

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

    const analysis = analyzeProductLockPrune(fixtureRoot);
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
    expect(lockfile.packages["saflib/node_modules/better-sqlite3"]).toBeUndefined();
  });
});
