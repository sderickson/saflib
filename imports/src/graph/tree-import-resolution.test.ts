import { describe, expect, it } from "vitest";
import {
  collectPublicExportPathsFromTree,
  createTreeResolveImportTarget,
} from "./tree-import-resolution.ts";
import type { PackageIndex } from "../types.ts";

describe("collectPublicExportPathsFromTree", () => {
  it("includes pattern export targets such as SDK requests/*", () => {
    const treePaths = new Set([
      "base/product/service/sdk/requests/admin/mocks.ts",
      "base/product/service/sdk/requests/admin/index.fakes.ts",
      "base/product/service/sdk/client.ts",
    ]);
    const paths = collectPublicExportPathsFromTree(
      "base/product/service/sdk",
      {
        "./client": "./client.ts",
        "./requests/*": "./requests/*.ts",
      },
      treePaths,
    );
    expect(paths).toContain("base/product/service/sdk/requests/admin/mocks.ts");
    expect(paths).toContain("base/product/service/sdk/requests/admin/index.fakes.ts");
    expect(paths).toContain("base/product/service/sdk/client.ts");
  });
});

describe("createTreeResolveImportTarget", () => {
  it("resolves # import maps within a package", () => {
    const treePaths = new Set([
      "base/product/clients/common/components/base-layout/BaseLayout.vue",
      "base/product/clients/common/composables/useSiteAdmin.ts",
    ]);
    const index: PackageIndex = new Map([
      [
        "@saflib/base-clients-common",
        {
          dir: "base/product/clients/common",
          exports: { "./composables/*": "./composables/*.ts" },
        },
      ],
    ]);
    const resolve = createTreeResolveImportTarget({
      treePaths,
      index,
      importsMapByPackageDir: new Map([
        [
          "base/product/clients/common",
          { "#composables/useSiteAdmin.ts": "./composables/useSiteAdmin.ts" },
        ],
      ]),
      packageRoots: [
        {
          packageName: "@saflib/base-clients-common",
          directory: "base/product/clients/common",
        },
      ],
    });

    expect(
      resolve(
        "base/product/clients/common/components/base-layout/BaseLayout.vue",
        "#composables/useSiteAdmin.ts",
      ),
    ).toBe("base/product/clients/common/composables/useSiteAdmin.ts");
  });
});
