import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { describe, expect, it } from "vitest";
import {
  checkBudgets,
  computeExportsMap,
  checkExports,
  generateExports,
  listExportableFiles,
  packageHasWorkflowMarkers,
} from "./index.ts";

const fixtureRoot = path.join(import.meta.dirname, "fixtures/mini-monorepo");
const pkgA = path.join(fixtureRoot, "packages/pkg-a");

describe("computeExportsMap", () => {
  it("maps index.ts to . and src files to subpaths", () => {
    const map = computeExportsMap(pkgA);
    expect(map["."]).toBe("./index.ts");
    expect(map["./src/util"]).toBe("./src/util.ts");
    expect(map["./src/chain-a"]).toBe("./src/chain-a.ts");
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

describe("checkBudgets", () => {
  it("skips packages without importBudget", () => {
    const { packagesChecked, violations } = checkBudgets({
      root: fixtureRoot,
    });
    expect(packagesChecked).toBe(0);
    expect(violations).toEqual([]);
  });

  it("reports violations when max is exceeded", () => {
    const tmpRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "saf-imports-budget-"),
    );
    try {
      fs.writeFileSync(
        path.join(tmpRoot, "package.json"),
        JSON.stringify({ name: "root", workspaces: ["packages/*"] }, null, 2) +
          "\n",
      );
      const pkgDir = path.join(tmpRoot, "packages", "p");
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, "package.json"),
        JSON.stringify(
          {
            name: "@tmp/budget-pkg",
            type: "module",
            importBudget: {
              testFiles: { maxModules: 0, maxExternalPackages: 0 },
              entries: { "./index.ts": { maxModules: 0 } },
            },
          },
          null,
          2,
        ) + "\n",
      );
      fs.writeFileSync(path.join(pkgDir, "index.ts"), "export const a = 1;\n");
      fs.writeFileSync(
        path.join(pkgDir, "thing.test.ts"),
        'import "./index.ts";\n',
      );

      const { packagesChecked, violations } = checkBudgets({ root: tmpRoot });
      expect(packagesChecked).toBe(1);
      expect(violations.length).toBeGreaterThan(0);
      expect(
        violations.some(
          (v) => v.kind === "testFiles" && v.metric === "modules",
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
