import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { describe, expect, it } from "vitest";
import {
  computeExportsMap,
  checkExports,
  generateExports,
  listExportableFiles,
  packageHasWorkflowMarkers,
  matchExportPattern,
  resolveSpecifier,
  buildPackageIndex,
  findMonorepoRoot,
} from "../../index.ts";

const fixtureRoot = path.join(import.meta.dirname, "../../fixtures/mini-monorepo");
const pkgA = path.join(fixtureRoot, "packages/pkg-a");

describe("computeExportsMap", () => {
  it("maps index.ts to . and src files to subpaths", () => {
    const map = computeExportsMap(pkgA);
    expect(map["."]).toBe("./index.ts");
    expect(map["./src/util"]).toBe("./src/util.ts");
    expect(map["./src/chain-a"]).toBe("./src/chain-a.ts");
  });

  it("maps nested package subdirectories (e.g. lib/) to subpaths", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-exports-lib-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ name: "@tmp/nested", type: "module" }, null, 2) + "\n",
      );
      fs.writeFileSync(path.join(tmp, "index.ts"), "export {};\n");
      fs.mkdirSync(path.join(tmp, "lib"));
      fs.writeFileSync(path.join(tmp, "lib", "leaf.ts"), "export const leaf = 1;\n");

      const map = computeExportsMap(tmp);
      expect(map["./lib/leaf"]).toBe("./lib/leaf.ts");
      expect(map["./env"]).toBeUndefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("does not merge exportsAliases into the exports map", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-exports-alias-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify(
          {
            name: "@tmp/alias",
            type: "module",
            exportsAliases: { "./short": "./long-name.ts" },
          },
          null,
          2,
        ) + "\n",
      );
      fs.writeFileSync(path.join(tmp, "long-name.ts"), "export {};\n");

      const map = computeExportsMap(tmp);
      expect(map["./short"]).toBeUndefined();
      expect(map["./long-name"]).toBe("./long-name.ts");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("flags leaf remaps and exportsAliases in checkExports", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-remap-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify(
          {
            name: "@tmp/remap",
            type: "module",
            exports: { "./short": "./lib/long.ts" },
            exportsAliases: { "./a": "./b.ts" },
          },
          null,
          2,
        ) + "\n",
      );
      fs.mkdirSync(path.join(tmp, "lib"));
      fs.writeFileSync(path.join(tmp, "lib/long.ts"), "export {};\n");
      fs.writeFileSync(path.join(tmp, "b.ts"), "export {};\n");

      const result = checkExports(tmp);
      expect(result.ok).toBe(false);
      expect(result.diffs.some((d) => d.includes("remap"))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("excludes test files and fixtures", () => {
    const files = listExportableFiles(path.join(import.meta.dirname));
    expect(files.some((f) => f.includes("measure-graph.test.ts"))).toBe(false);
    expect(files.some((f) => f.includes("fixtures"))).toBe(false);
  });
});

describe("checkExports / generateExports", () => {
  it("round-trips generate then check on a temp package", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-exports-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ name: "@tmp/pkg", type: "module" }, null, 2) + "\n",
      );
      fs.writeFileSync(path.join(tmp, "index.ts"), "export const x = 1;\n");
      fs.mkdirSync(path.join(tmp, "src"));
      fs.writeFileSync(path.join(tmp, "src", "util.ts"), "export const u = 2;\n");

      const gen = generateExports(tmp);
      expect(gen.written).toBe(true);
      expect(gen.exports["."]).toBe("./index.ts");
      expect(gen.exports["./src/util"]).toBe("./src/util.ts");

      const check = checkExports(tmp);
      expect(check.ok).toBe(true);
      expect(check.diffs).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("refuses generate when WORKFLOW AREA markers present", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-wf-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify(
          {
            name: "@tmp/wf",
            // comment-like marker in a string value is enough for the heuristic
            description: "// BEGIN WORKFLOW AREA foo FOR bar",
          },
          null,
          2,
        ) + "\n",
      );
      fs.writeFileSync(path.join(tmp, "index.ts"), "export {};\n");
      expect(packageHasWorkflowMarkers(tmp)).toBe(true);
      const gen = generateExports(tmp);
      expect(gen.written).toBe(false);
      expect(gen.error).toMatch(/WORKFLOW AREA/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("export patterns", () => {
  it("substitutes wildcard export targets with nested captures (Node semantics)", () => {
    // Multi-star keys are invalid for Node package exports.
    expect(
      matchExportPattern(
        "./requests/matters/list",
        "./requests/*/*",
        "./requests/*/*.ts",
      ),
    ).toBeNull();
    // Single `*` may include `/`.
    expect(
      matchExportPattern(
        "./requests/matters/list",
        "./requests/*",
        "./requests/*.ts",
      ),
    ).toBe("./requests/matters/list.ts");
    expect(
      matchExportPattern(
        "./schemas/matter",
        "./schemas/*",
        "./schemas/*.ts",
      ),
    ).toBe("./schemas/matter.ts");
  });

  it("rejects export keys with more than one *", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-pattern-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify(
          {
            name: "@tmp/pattern",
            type: "module",
            exports: {
              "./groups/*": "./groups/*.ts",
              "./groups/*/*": "./groups/*/*.ts",
            },
          },
          null,
          2,
        ) + "\n",
      );
      const check = checkExports(tmp);
      expect(check.ok).toBe(false);
      expect(check.diffs.some((d) => d.includes("invalid pattern key"))).toBe(
        true,
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("validates single-star pattern exports on a temp package", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-pattern-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify(
          {
            name: "@tmp/pattern",
            type: "module",
            exports: {
              "./groups/*": "./groups/*.ts",
            },
          },
          null,
          2,
        ) + "\n",
      );
      fs.mkdirSync(path.join(tmp, "groups", "foo"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "groups", "foo", "index.ts"), "export {};\n");
      fs.writeFileSync(path.join(tmp, "groups", "foo", "bar.ts"), "export const bar = 1;\n");

      const check = checkExports(tmp);
      expect(check.ok).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("keeps /index in nested export keys from computeExportsMap", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-index-key-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ name: "@tmp/idx", type: "module" }, null, 2) + "\n",
      );
      fs.mkdirSync(path.join(tmp, "groups", "foo"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "groups", "foo", "index.ts"), "export {};\n");
      const map = computeExportsMap(tmp);
      expect(map["./groups/foo/index"]).toBe("./groups/foo/index.ts");
      expect(map["./groups/foo"]).toBeUndefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("resolves pattern exports in resolveSpecifier", () => {
    const root = findMonorepoRoot(path.join(import.meta.dirname, "../../.."));
    const index = buildPackageIndex(root);
    const from = path.join(
      root,
      "saflib/express/workflows/templates/routes/foo/handler.ts",
    );
    const result = resolveSpecifier(
      "template-package-http/routes/__group-name__/index",
      from,
      index,
    );
    expect(result?.kind).toBe("file");
    if (result?.kind === "file") {
      expect(result.path).toMatch(/routes\/__group-name__\/index\.ts$/);
    }
  });
});
