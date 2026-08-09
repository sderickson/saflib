import path from "node:path";
import { describe, expect, it } from "vitest";
import { measureGraph } from "./index.ts";
import { extractImports } from "./src/graph/extract-imports.ts";
import { readSource } from "./src/graph/read-source.ts";
import {
  buildPackageIndex,
  findMonorepoRoot,
  resolveSpecifier,
} from "./src/resolve/index.ts";

const fixtureRoot = path.join(import.meta.dirname, "fixtures/mini-monorepo");
const pkgA = path.join(fixtureRoot, "packages/pkg-a");
const pkgB = path.join(fixtureRoot, "packages/pkg-b");
const vueApp = path.join(fixtureRoot, "packages/vue-app");

describe("findMonorepoRoot / buildPackageIndex", () => {
  it("finds the fixture root from a nested package", () => {
    expect(findMonorepoRoot(pkgB)).toBe(fixtureRoot);
  });

  it("indexes workspace packages by name", () => {
    const index = buildPackageIndex(fixtureRoot);
    expect(index.has("@fixture/pkg-a")).toBe(true);
    expect(index.has("@fixture/pkg-b")).toBe(true);
    expect(index.has("@fixture/vue-app")).toBe(true);
  });
});

describe("extractImports", () => {
  it("extracts runtime imports and marks type-only", () => {
    const src = `
import { a } from "./a.ts";
import type { T } from "./types.ts";
export { b } from "./b.ts";
export type { U } from "./u.ts";
const x = await import("./dyn.ts");
`;
    const imports = extractImports(src);
    expect(imports).toEqual(
      expect.arrayContaining([
        { spec: "./a.ts", isTypeOnly: false },
        { spec: "./types.ts", isTypeOnly: true },
        { spec: "./b.ts", isTypeOnly: false },
        { spec: "./u.ts", isTypeOnly: true },
        { spec: "./dyn.ts", isTypeOnly: false },
      ]),
    );
  });
});

describe("measureGraph — relative chain", () => {
  it("counts a simple three-file chain", () => {
    const result = measureGraph(path.join(pkgA, "src/chain-a.ts"), {
      root: fixtureRoot,
    });
    expect(result.modules).toBe(3);
    expect(result.ext).toBe(0);
    expect(result.lines).toBeGreaterThan(0);
  });
});

describe("measureGraph — workspace exports", () => {
  it("resolves package exports including conditional import form", () => {
    const index = buildPackageIndex(fixtureRoot);
    const fromEntry = path.join(pkgB, "entry.ts");

    const root = resolveSpecifier("@fixture/pkg-b", fromEntry, index);
    expect(root).toEqual({
      kind: "file",
      path: path.join(pkgB, "index.ts"),
    });

    const sub = resolveSpecifier("@fixture/pkg-a/util", fromEntry, index);
    expect(sub).toEqual({
      kind: "file",
      path: path.join(pkgA, "src/util.ts"),
    });

    const ext = resolveSpecifier("stripe", fromEntry, index);
    expect(ext).toEqual({ kind: "external", root: "stripe" });
  });

  it("walks across workspace packages via exports", () => {
    const result = measureGraph(path.join(pkgB, "entry.ts"), {
      root: fixtureRoot,
    });
    // entry.ts → pkg-b/index.ts → pkg-a/util.ts; node:fs counted as ext
    expect(result.modules).toBe(3);
    expect(result.ext).toBe(1);
  });
});

describe("measureGraph — type-only exclusion", () => {
  it("excludes import type / export type by default", () => {
    const without = measureGraph(path.join(pkgB, "entry.ts"), {
      root: fixtureRoot,
    });
    const withTypes = measureGraph(path.join(pkgB, "entry.ts"), {
      root: fixtureRoot,
      includeTypes: true,
    });
    expect(without.modules).toBe(3);
    expect(withTypes.modules).toBeGreaterThan(without.modules);
    // types.ts is only reached via type-only edges
    expect(withTypes.modules).toBe(4);
  });
});

describe("measureGraph — Vue SFC", () => {
  it("extracts script blocks from .vue files", () => {
    const src = readSource(path.join(vueApp, "App.vue"));
    expect(src).toContain('from "./helper.ts"');
    expect(src).toContain('from "./Child.vue"');
    expect(src).not.toContain("<template>");
  });

  it("traverses .vue → .ts and nested .vue imports", () => {
    const result = measureGraph(path.join(vueApp, "App.vue"), {
      root: fixtureRoot,
    });
    // App.vue, helper.ts, Child.vue, nested.ts
    expect(result.modules).toBe(4);
    expect(result.ext).toBe(0);
  });
});
