import { describe, expect, it } from "vitest";
import { buildPackageGraph } from "./package-graph.ts";
import type { PackageManifest } from "./package-manifests.ts";

function manifest(
  directory: string,
  name: string,
  kind: PackageManifest["kind"],
  deps: string[] = [],
  feature?: string,
): PackageManifest {
  return {
    package_name: name,
    directory,
    kind,
    mixedIdentifiers: [],
    json: {
      name,
      saf: { kind, ...(feature ? { feature } : {}) },
      dependencies: Object.fromEntries(deps.map((d) => [d, "*"])),
    } as PackageManifest["json"],
  };
}

describe("buildPackageGraph", () => {
  const graph = buildPackageGraph(
    [
      manifest("", "root", "other"),
      manifest("lib/x", "@lib/x", "lib"),
      manifest("prod/service/db", "@p/db", "db", ["@p/objects", "@lib/x"]),
      manifest("prod/service/objects", "@p/objects", "objects"),
      manifest("prod/service/spec", "@p/spec", "spec", ["@p/objects"]),
      manifest("prod/service/common", "@p/common", "domain", [
        "@p/db",
        "@p/spec",
      ]),
      manifest("prod/billing/db", "@p/billing-db", "db", ["@p/db"]),
      manifest("prod/dossier/db", "@p/dossier-db", "db", [], "service"),
    ],
    { hash: "abc", product_root: "prod" },
  );

  it("keeps only product packages, with features relative to the product root", () => {
    expect(
      graph.packages.map((p) => [
        p.package_name,
        p.directory,
        p.feature,
        p.core,
      ]),
    ).toEqual([
      ["@p/billing-db", "billing/db", "billing", false],
      ["@p/dossier-db", "dossier/db", "service", true],
      ["@p/common", "service/common", "service", true],
      ["@p/db", "service/db", "service", true],
      ["@p/objects", "service/objects", "service", true],
      ["@p/spec", "service/spec", "service", true],
    ]);
  });

  it("lists product dependencies and flags layer violations", () => {
    expect(
      graph.edges.map((e) => [e.from, e.to, e.violation?.rule ?? null]),
    ).toEqual([
      ["@p/db", "@p/objects", null],
      ["@p/spec", "@p/objects", null],
      ["@p/common", "@p/db", null],
      ["@p/common", "@p/spec", "order"],
      ["@p/billing-db", "@p/db", null],
    ]);
  });
});
