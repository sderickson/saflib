import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildReferenceGraph,
  detectReferenceCycles,
  previewReferencesGenerate,
  resolveTsconfigEntry,
} from "./index.ts";

const fixtureRoot = path.join(import.meta.dirname, "fixtures/mini-monorepo");
const pkgA = path.join(fixtureRoot, "packages/pkg-a");
const pkgB = path.join(fixtureRoot, "packages/pkg-b");
const pkgC = path.join(fixtureRoot, "packages/pkg-c");
const vueApp = path.join(fixtureRoot, "packages/vue-app");

describe("resolveTsconfigEntry", () => {
  it("returns tsconfig.json when present", () => {
    expect(resolveTsconfigEntry(pkgA)).toBe("tsconfig.json");
  });

  it("returns package-root tsconfig for Vue split packages", () => {
    expect(resolveTsconfigEntry(vueApp)).toBe("tsconfig.json");
  });

  it("returns null when missing", () => {
    expect(resolveTsconfigEntry(pkgC)).toBeNull();
  });
});

describe("buildReferenceGraph", () => {
  it("includes deps and devDeps edges among typecheckable packages", () => {
    const { graph, missingTsconfig, skippedMeta } =
      buildReferenceGraph(fixtureRoot);

    expect(skippedMeta).toContain("mini-monorepo");
    expect(missingTsconfig).toEqual(["@fixture/pkg-c"]);

    expect(graph.has("@fixture/pkg-a")).toBe(true);
    expect(graph.has("@fixture/pkg-b")).toBe(true);
    expect(graph.has("@fixture/vue-app")).toBe(true);
    expect(graph.has("@fixture/pkg-c")).toBe(false);

    // pkg-a → pkg-b (dependency); pkg-c dropped (no tsconfig)
    expect(graph.get("@fixture/pkg-a")!.references).toEqual([
      "@fixture/pkg-b",
    ]);

    // pkg-b → pkg-a via devDependency
    expect(graph.get("@fixture/pkg-b")!.references).toEqual([
      "@fixture/pkg-a",
    ]);

    // vue-app → pkg-a (dep) + pkg-b (devDep)
    expect(graph.get("@fixture/vue-app")!.references).toEqual([
      "@fixture/pkg-a",
      "@fixture/pkg-b",
    ]);
  });
});

describe("detectReferenceCycles", () => {
  it("finds the pkg-a ↔ pkg-b cycle", () => {
    const { graph } = buildReferenceGraph(fixtureRoot);
    const cycles = detectReferenceCycles(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual([
      "@fixture/pkg-a",
      "@fixture/pkg-b",
      "@fixture/pkg-a",
    ]);
  });
});

describe("previewReferencesGenerate", () => {
  it("emits relative reference paths and marks write unsupported", () => {
    const preview = previewReferencesGenerate({
      root: fixtureRoot,
      write: true,
    });

    expect(preview.write).toBe(true);
    expect(preview.writeSupported).toBe(false);
    expect(preview.missingTsconfig).toEqual(["@fixture/pkg-c"]);

    const a = preview.packages.find((p) => p.package === "@fixture/pkg-a");
    expect(a).toBeDefined();
    expect(a!.references).toEqual([{ path: "../pkg-b" }]);

    const vue = preview.packages.find((p) => p.package === "@fixture/vue-app");
    expect(vue!.references.map((r) => r.path).sort()).toEqual([
      "../pkg-a",
      "../pkg-b",
    ]);
  });
});
