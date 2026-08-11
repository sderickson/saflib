import { describe, expect, it } from "vitest";
import { buildReferenceGraph, workspaceDepsOf } from "./build-graph.ts";

describe("buildReferenceGraph", () => {
  it("does not add devDependency workspace packages as project references", () => {
    const { graph } = buildReferenceGraph();
    for (const node of graph.values()) {
      expect(node.references).not.toContain("@saflib/playwright");
      expect(node.references).not.toContain("@saflib/vitest");
    }
  });
});

describe("workspaceDepsOf", () => {
  it("lists only workspace dependencies, not devDependencies", () => {
    const packages = new Set([
      "@saflib/playwright",
      "@saflib/utils",
      "@saflib/vitest",
    ]);
    const deps = workspaceDepsOf(
      {
        devDependencies: {
          "@saflib/playwright": "*",
          "@saflib/vitest": "*",
        },
        dependencies: { "@saflib/utils": "*" },
      },
      packages,
    );
    expect(deps).toEqual(["@saflib/utils"]);
  });
});
