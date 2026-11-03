import { describe, expect, it } from "vitest";
import { findLockfileVersionSkew } from "./align.ts";

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
