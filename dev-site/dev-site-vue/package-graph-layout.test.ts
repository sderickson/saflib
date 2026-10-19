import { describe, expect, it } from "vitest";
import {
  layoutPackageGraph,
  mergePackageGraphs,
  orderLanes,
  shortPackageName,
  transitiveDependencies,
  type PackageGraphData,
} from "./package-graph-layout.ts";

const pkg = (name: string, kind: string, feature: string, core = true) => ({
  package_name: name,
  directory: `${feature || "."}/${name}`,
  kind,
  feature,
  core,
});

const head: PackageGraphData = {
  packages: [
    pkg("@p/http", "http", "service"),
    pkg("@p/db", "db", "service"),
    pkg("@p/billing-http", "http", "billing", false),
    pkg("@p/billing-db", "db", "billing", false),
  ],
  edges: [
    { from: "@p/http", to: "@p/db" },
    { from: "@p/billing-http", to: "@p/billing-db" },
    { from: "@p/billing-db", to: "@p/db" },
  ],
};

describe("mergePackageGraphs", () => {
  it("marks nothing without a base", () => {
    const merged = mergePackageGraphs(head);
    expect(merged.hasChanges).toBe(false);
    expect(merged.nodes.every((n) => !n.change)).toBe(true);
  });

  it("marks added, removed and changed packages and edges against the base", () => {
    const base: PackageGraphData = {
      packages: [
        pkg("@p/http", "http", "service"),
        pkg("@p/db", "db", "service"),
        pkg("@p/old", "lib", "service"),
      ],
      edges: [
        { from: "@p/http", to: "@p/db" },
        { from: "@p/http", to: "@p/old" },
      ],
    };
    const merged = mergePackageGraphs(head, base);
    const change = Object.fromEntries(
      merged.nodes.map((n) => [n.package_name, n.change ?? null]),
    );
    expect(change).toEqual({
      "@p/http": "changed",
      "@p/db": null,
      "@p/billing-http": "added",
      "@p/billing-db": "added",
      "@p/old": "removed",
    });
    expect(
      merged.edges.filter((e) => e.change).map((e) => [e.from, e.to, e.change]),
    ).toEqual([
      ["@p/billing-http", "@p/billing-db", "added"],
      ["@p/billing-db", "@p/db", "added"],
      ["@p/http", "@p/old", "removed"],
    ]);
    expect(merged.hasChanges).toBe(true);
  });
});

describe("layoutPackageGraph", () => {
  it("puts layers in rows and features in lanes, core first", () => {
    const layout = layoutPackageGraph(mergePackageGraphs(head));
    expect(layout.lanes.map((l) => l.feature)).toEqual(["service", "billing"]);
    const at = (name: string) =>
      layout.nodes.find((n) => n.package_name === name)!;
    expect(at("@p/http").y).toBeLessThan(at("@p/db").y);
    expect(at("@p/http").y).toBe(at("@p/billing-http").y);
    expect(at("@p/http").x).toBeLessThan(at("@p/billing-http").x);
    expect(layout.width).toBeGreaterThan(0);
  });

  it("orders a box by where its neighbours are", () => {
    const graph: PackageGraphData = {
      packages: [
        pkg("@p/a-http", "http", "service"),
        pkg("@p/b-http", "http", "service"),
        pkg("@p/z-db", "db", "service"),
        pkg("@p/y-db", "db", "service"),
      ],
      // a → y and b → z: barycenters should put y under a and z under b.
      edges: [
        { from: "@p/a-http", to: "@p/y-db" },
        { from: "@p/b-http", to: "@p/z-db" },
      ],
    };
    const layout = layoutPackageGraph(mergePackageGraphs(graph));
    const x = (n: string) => layout.nodes.find((p) => p.package_name === n)!.x;
    expect(Math.sign(x("@p/a-http") - x("@p/b-http"))).toBe(
      Math.sign(x("@p/y-db") - x("@p/z-db")),
    );
  });
});

describe("collapsed lanes", () => {
  it("shrinks collapsed lanes and hides their packages", () => {
    const merged = mergePackageGraphs(head);
    const full = layoutPackageGraph(merged);
    const shrunk = layoutPackageGraph(merged, {
      collapsedLanes: new Set(["billing"]),
    });
    const billing = (l: typeof full) =>
      l.lanes.find((lane) => lane.feature === "billing")!;
    expect(billing(shrunk).collapsed).toBe(true);
    expect(billing(shrunk).width).toBeLessThan(billing(full).width);
    expect(shrunk.width).toBeLessThan(full.width);
    expect(
      shrunk.nodes
        .filter((n) => n.hidden)
        .map((n) => n.package_name)
        .sort(),
    ).toEqual(["@p/billing-db", "@p/billing-http"]);
  });
});

describe("helpers", () => {
  it("orders lanes core first", () => {
    expect(
      orderLanes([
        pkg("a", "http", "zeta", false),
        pkg("b", "http", "clients"),
        pkg("c", "http", "service"),
        pkg("d", "http", ""),
        pkg("e", "http", "alpha", false),
      ]),
    ).toEqual(["", "service", "clients", "alpha", "zeta"]);
  });

  it("follows dependencies transitively", () => {
    expect(
      [...transitiveDependencies("@p/billing-http", head.edges)].sort(),
    ).toEqual(["@p/billing-db", "@p/db"]);
  });

  it("drops the shared scope and product prefix", () => {
    const names = ["@acme/shop-http", "@acme/shop-dossier-db", "@acme/shop-db"];
    expect(shortPackageName("@acme/shop-dossier-db", names)).toBe("dossier-db");
  });
});
