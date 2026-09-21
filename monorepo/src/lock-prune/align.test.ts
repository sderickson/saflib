import { describe, expect, it } from "vitest";
import {
  alignSkewedLockfileEntries,
  findLockfileVersionSkew,
  findPlatformAlignmentGaps,
  findRootLockfileVersionSkew,
} from "./align.ts";
import type { PackageLock } from "./types.ts";

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
      lockPackages: {
        "node_modules/@tanstack/vue-query": { version: "5.85.9" },
      },
    };

    expect(findLockfileVersionSkew(lockfile, platform)).toEqual([
      {
        kind: "lockfile-version-skew",
        dependency: "@tanstack/vue-query",
        productLockfileKey: "saflib/sdk/node_modules/@tanstack/vue-query",
        productVersion: "5.102.8",
        platformVersion: "5.85.9",
        platformLockfileKey: "node_modules/@tanstack/vue-query",
        productAlignKey: "node_modules/@tanstack/vue-query",
        rootLockfileKey: "node_modules/@tanstack/vue-query",
      },
    ]);
  });
});

describe("alignSkewedLockfileEntries", () => {
  it("copies the platform root package and removes nested skew (multer-style)", () => {
    const lockfile = {
      packages: {
        "node_modules/@types/multer": {
          version: "1.4.13",
          resolved: "https://registry.npmjs.org/@types/multer/-/multer-1.4.13.tgz",
        },
        "saflib/node_modules/@types/multer": {
          version: "2.2.0",
          resolved: "https://registry.npmjs.org/@types/multer/-/multer-2.2.0.tgz",
        },
      },
    };
    const platform = {
      overrides: {},
      resolvedVersions: new Map([["@types/multer", "2.1.0"]]),
      lockPackages: {
        "node_modules/@types/multer": {
          version: "2.1.0",
          resolved: "https://registry.npmjs.org/@types/multer/-/multer-2.1.0.tgz",
        },
      },
    };
    const issues = findLockfileVersionSkew(lockfile, platform);

    const aligned = alignSkewedLockfileEntries(lockfile, issues, platform);

    expect(aligned).toEqual(["@types/multer"]);
    expect(lockfile.packages["node_modules/@types/multer"]).toMatchObject({
      version: "2.1.0",
    });
    expect(lockfile.packages["saflib/node_modules/@types/multer"]).toBeUndefined();
  });

  it("aligns intentional nested dual-install paths without clobbering root", () => {
    const lockfile = {
      packages: {
        "node_modules/minimatch": { version: "9.0.9" },
        "saflib/workflows/node_modules/minimatch": { version: "10.1.1" },
        "saflib/workflows/node_modules/brace-expansion": { version: "5.0.0" },
      },
    };
    const platform = {
      overrides: {},
      resolvedVersions: new Map([["minimatch", "9.0.9"]]),
      lockPackages: {
        "node_modules/minimatch": { version: "9.0.9" },
        workflows: {
          name: "@saflib/workflows",
          dependencies: { minimatch: "^10.0.0" },
        },
        "workflows/node_modules/minimatch": {
          version: "10.2.4",
          dependencies: { "brace-expansion": "^5.0.2" },
        },
        "workflows/node_modules/brace-expansion": { version: "5.0.5" },
      },
    };
    const issues = [
      ...findPlatformAlignmentGaps(lockfile, platform),
      ...findLockfileVersionSkew(lockfile, platform),
    ];

    alignSkewedLockfileEntries(lockfile, issues, platform);

    expect(lockfile.packages["node_modules/minimatch"]).toMatchObject({
      version: "9.0.9",
    });
    expect(
      lockfile.packages["saflib/workflows/node_modules/minimatch"],
    ).toMatchObject({ version: "10.2.4" });
    expect(
      lockfile.packages["saflib/workflows/node_modules/brace-expansion"],
    ).toMatchObject({ version: "5.0.5" });
  });

  it("preserves intentional nested dual-installs when aligning a different nested skew to root", () => {
    const lockfile = {
      packages: {
        "node_modules/esbuild": { version: "0.28.2" },
        "saflib/node_modules/esbuild": { version: "0.27.7" },
        "saflib/vitepress/node_modules/esbuild": { version: "0.27.7" },
        "saflib/vitepress/node_modules/@esbuild/darwin-arm64": {
          version: "0.27.7",
        },
      },
    };
    const platform = {
      overrides: {},
      resolvedVersions: new Map([["esbuild", "0.28.2"]]),
      lockPackages: {
        "node_modules/esbuild": { version: "0.28.2" },
        vitepress: {
          name: "@saflib/vitepress",
          dependencies: { esbuild: "^0.27.0" },
        },
        "vitepress/node_modules/esbuild": { version: "0.27.7" },
        "vitepress/node_modules/@esbuild/darwin-arm64": { version: "0.27.7" },
      },
    };
    const issues = [
      ...findPlatformAlignmentGaps(lockfile, platform),
      ...findLockfileVersionSkew(lockfile, platform),
    ];

    alignSkewedLockfileEntries(lockfile, issues, platform);

    expect(lockfile.packages["node_modules/esbuild"]).toMatchObject({
      version: "0.28.2",
    });
    expect(lockfile.packages["saflib/node_modules/esbuild"]).toBeUndefined();
    expect(
      lockfile.packages["saflib/vitepress/node_modules/esbuild"],
    ).toMatchObject({ version: "0.27.7" });
    expect(
      lockfile.packages["saflib/vitepress/node_modules/@esbuild/darwin-arm64"],
    ).toMatchObject({ version: "0.27.7" });
  });
});

describe("findPlatformAlignmentGaps", () => {
  it("flags missing intentional nested dual-installs so they can be copied from the platform", () => {
    const packages: NonNullable<PackageLock["packages"]> = {
      "node_modules/esbuild": { version: "0.28.2" },
    };
    const lockfile: PackageLock = { packages };
    const platform = {
      overrides: {},
      resolvedVersions: new Map([["esbuild", "0.28.2"]]),
      lockPackages: {
        "node_modules/esbuild": { version: "0.28.2" },
        vitepress: {
          name: "@saflib/vitepress",
          dependencies: { esbuild: "^0.27.0" },
        },
        "vitepress/node_modules/esbuild": {
          version: "0.27.7",
          optionalDependencies: {
            "@esbuild/darwin-arm64": "0.27.7",
          },
        },
        "vitepress/node_modules/@esbuild/darwin-arm64": { version: "0.27.7" },
      },
    };

    const gaps = findPlatformAlignmentGaps(lockfile, platform);
    expect(gaps).toEqual([
      {
        kind: "lockfile-version-skew",
        dependency: "esbuild",
        productLockfileKey: "saflib/vitepress/node_modules/esbuild",
        productVersion: "(missing)",
        platformVersion: "0.27.7",
        platformLockfileKey: "vitepress/node_modules/esbuild",
        productAlignKey: "saflib/vitepress/node_modules/esbuild",
        rootLockfileKey: "node_modules/esbuild",
      },
    ]);

    alignSkewedLockfileEntries(lockfile, gaps, platform);
    expect(packages["saflib/vitepress/node_modules/esbuild"]).toMatchObject({
      version: "0.27.7",
    });
    expect(
      packages["saflib/vitepress/node_modules/@esbuild/darwin-arm64"],
    ).toMatchObject({ version: "0.27.7" });
  });

  it("flags exact override root pins that drift from the platform lock", () => {
    const lockfile = {
      packages: {
        "node_modules/vite": { version: "8.3.0" },
      },
    };
    const platform = {
      overrides: { vite: "8.0.13" },
      resolvedVersions: new Map([["vite", "8.0.13"]]),
      lockPackages: {
        "node_modules/vite": { version: "8.0.13" },
      },
    };

    expect(findPlatformAlignmentGaps(lockfile, platform)).toEqual([
      {
        kind: "lockfile-version-skew",
        dependency: "vite",
        productLockfileKey: "node_modules/vite",
        productVersion: "8.3.0",
        platformVersion: "8.0.13",
        platformLockfileKey: "node_modules/vite",
        productAlignKey: "node_modules/vite",
        rootLockfileKey: "node_modules/vite",
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

  it("ignores caret/tilde range overrides even when resolved versions differ", () => {
    const lockfile = {
      packages: {
        "node_modules/vue-router": { version: "5.3.1" },
        "node_modules/typescript": { version: "6.0.3" },
      },
    };
    const platform = {
      overrides: {
        "vue-router": "^5.0.0",
        typescript: "~6.0.0",
      },
      resolvedVersions: new Map([
        ["vue-router", "5.0.4"],
        ["typescript", "6.0.2"],
      ]),
      lockPackages: {
        "node_modules/vue-router": { version: "5.0.4" },
        "node_modules/typescript": { version: "6.0.2" },
      },
    };

    expect(findRootLockfileVersionSkew(lockfile, platform)).toEqual([]);
  });
});
