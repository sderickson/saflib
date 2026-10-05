import { describe, expect, it } from "vitest";
import { pruneStaleLockfileEntries } from "./stale.ts";
import { loadProductFixture, useProductFixtureLifecycle } from "./test-helpers.ts";

useProductFixtureLifecycle();

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
