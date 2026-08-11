import path from "node:path";
import { describe, expect, it } from "vitest";
import { measureGraph } from "./walk-graph.ts";

const fixtureRoot = path.join(import.meta.dirname, "../../fixtures/mini-monorepo");

describe("measureGraph", () => {
  it("returns sorted repo-root-relative paths and externals when verbose", () => {
    const entry = path.join(fixtureRoot, "packages/pkg-b/entry.ts");
    const result = measureGraph(entry, { root: fixtureRoot, verbose: true });

    expect(result.modules).toBeGreaterThan(0);
    expect(result.files).toEqual(
      [...result.files!].sort((a, b) => a.localeCompare(b)),
    );
    expect(result.files).toContain("packages/pkg-b/entry.ts");
    expect(result.files).toContain("packages/pkg-b/index.ts");
    expect(result.externals).toEqual(
      [...result.externals!].sort((a, b) => a.localeCompare(b)),
    );
    expect(result.externals).toContain("node:fs");
  });

  it("omits file lists when verbose is false", () => {
    const entry = path.join(fixtureRoot, "packages/pkg-b/entry.ts");
    const result = measureGraph(entry, { root: fixtureRoot });

    expect(result.files).toBeUndefined();
    expect(result.externals).toBeUndefined();
  });
});
