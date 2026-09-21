import { describe, expect, it } from "vitest";
import {
  isExactOverrideVersion,
  isEmbeddedProductMonorepo,
} from "./platform.ts";
import {
  createFixtureRoot,
  loadProductFixture,
  removeFixtureRoot,
  useProductFixtureLifecycle,
  writeFixtureTree,
} from "./test-helpers.ts";

useProductFixtureLifecycle();

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

describe("isExactOverrideVersion", () => {
  it("accepts exact semver and rejects ranges", () => {
    expect(isExactOverrideVersion("8.0.13")).toBe(true);
    expect(isExactOverrideVersion("1.0.1-beta.1")).toBe(true);
    expect(isExactOverrideVersion("^5.0.0")).toBe(false);
    expect(isExactOverrideVersion("~6.0.0")).toBe(false);
    expect(isExactOverrideVersion("*")).toBe(false);
  });
});
