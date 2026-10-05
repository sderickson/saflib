import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPackageIndex } from "@saflib/imports";
import {
  findCompetingDependencies,
  findRedundantDependencies,
  syncPlatformOverrides,
} from "./package-deps.ts";
import { readPlatformContract } from "./platform.ts";
import {
  loadProductFixture,
  readProductFile,
  useProductFixtureLifecycle,
} from "./test-helpers.ts";

useProductFixtureLifecycle();

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

  it("flags competing deps on the product root even when another package shares its name", () => {
    const root = loadProductFixture({
      "/product/saflib/vite/package.json": JSON.stringify({
        name: "@saflib/vite",
        dependencies: { vite: "8.0.13" },
      }),
      "/product/saflib/package.json": JSON.stringify({
        name: "@saflib/saflib",
        overrides: { vite: "8.0.13" },
      }),
      "/product/package.json": JSON.stringify({
        name: "@product/root",
        devDependencies: { vite: "8.1.5" },
      }),
      "/product/.saf-docker/stage/copy/package.json": JSON.stringify({
        name: "@product/root",
        devDependencies: {},
      }),
    });

    const issues = findCompetingDependencies(root, buildPackageIndex(root));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      dependency: "vite",
      productSpec: "8.1.5",
      packageJsonPath: join(root, "package.json"),
    });
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
