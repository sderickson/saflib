import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkExports,
  collectPublicExportRepoPaths,
  computeExportsMap,
  leafExportRemapDiffs,
} from "./generate-exports.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const clientsCommonDir = path.resolve(dirname, "../../../base/clients/common");

describe("leafExportRemapDiffs", () => {
  it("allows Vue SFC export aliases", () => {
    expect(
      leafExportRemapDiffs({
        "./components/base-layout":
          "./components/base-layout/BaseLayout.vue",
      }),
    ).toEqual([]);
  });

  it("still flags non-Vue leaf remaps", () => {
    expect(
      leafExportRemapDiffs({
        "./foo": "./lib/foo.ts",
      }),
    ).toEqual([
      "remap: ./foo → ./lib/foo.ts (path must mirror key; no leaf aliases)",
    ]);
  });
});

describe("computeExportsMap", () => {
  it("does not auto-generate exports for .vue files", () => {
    const map = computeExportsMap(clientsCommonDir);
    expect(
      Object.values(map).some((target) => target.endsWith(".vue")),
    ).toBe(false);
  });
});

describe("collectPublicExportRepoPaths", () => {
  it("includes explicit Vue export targets", () => {
    const paths = collectPublicExportRepoPaths(
      clientsCommonDir,
      "saflib/base/clients/common",
    );
    expect(paths).toContain(
      "saflib/base/clients/common/components/base-layout/BaseLayout.vue",
    );
  });
});

describe("checkExports", () => {
  it("passes for base-clients-common hybrid exports", () => {
    const result = checkExports(clientsCommonDir);
    expect(result.diffs).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
