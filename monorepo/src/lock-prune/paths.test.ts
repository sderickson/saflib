import { describe, expect, it } from "vitest";
import {
  isIntentionalNestedInstallKey,
  packageNameFromNodeModulesSuffix,
  productKeyForPlatformLockKey,
} from "./paths.ts";

describe("packageNameFromNodeModulesSuffix", () => {
  it("parses unscoped and scoped package names", () => {
    expect(packageNameFromNodeModulesSuffix("esbuild")).toBe("esbuild");
    expect(packageNameFromNodeModulesSuffix("@esbuild/darwin-arm64")).toBe(
      "@esbuild/darwin-arm64",
    );
  });

  it("rejects deeper paths", () => {
    expect(packageNameFromNodeModulesSuffix("esbuild/node_modules/foo")).toBe(
      undefined,
    );
    expect(packageNameFromNodeModulesSuffix("@scope/name/extra")).toBe(
      undefined,
    );
  });
});

describe("isIntentionalNestedInstallKey", () => {
  it("matches workspace dual-installs and rejects root/deeper nests", () => {
    expect(isIntentionalNestedInstallKey("vitepress/node_modules/esbuild")).toBe(
      true,
    );
    expect(
      isIntentionalNestedInstallKey("workflows/node_modules/minimatch"),
    ).toBe(true);
    expect(isIntentionalNestedInstallKey("node_modules/esbuild")).toBe(false);
    expect(
      isIntentionalNestedInstallKey(
        "vitepress/node_modules/esbuild/node_modules/foo",
      ),
    ).toBe(false);
  });
});

describe("productKeyForPlatformLockKey", () => {
  it("prefixes nested platform keys with saflib/", () => {
    expect(productKeyForPlatformLockKey("node_modules/vite")).toBe(
      "node_modules/vite",
    );
    expect(
      productKeyForPlatformLockKey("vitepress/node_modules/esbuild"),
    ).toBe("saflib/vitepress/node_modules/esbuild");
  });
});
