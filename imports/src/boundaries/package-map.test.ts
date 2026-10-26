import { describe, expect, it } from "vitest";
import type { PackageGraph } from "./check-boundaries.ts";
import {
  formatPackageDetail,
  formatProductMap,
  productMap,
} from "./package-map.ts";

const pkg = (
  name: string,
  kind: string,
  feature: string,
  sourceFileLines: Record<string, number> = {},
) => ({
  name,
  relDir: `prod/${feature}/${name.split("/")[1]}`,
  kind,
  feature,
  core: feature === "service",
  productRoot: "/repo/prod",
  dependencies: [],
  devDependencies: [],
  sourceFiles: Object.keys(sourceFileLines).length,
  sourceLines: Object.values(sourceFileLines).reduce((a, b) => a + b, 0),
  testFiles: 0,
  testLines: 0,
  sourceFileLines,
});

const graph: PackageGraph = {
  packages: [
    pkg("@p/http", "http", "service", {
      "handlers/orders/list.ts": 120,
      "handlers/users/get.ts": 40,
    }),
    pkg("@p/db", "db", "service", {
      "queries/orders.ts": 300,
      "errors.ts": 10,
    }),
    pkg("@p/billing-http", "http", "billing", { "index.ts": 50 }),
    { ...pkg("@fw/express", "lib", "x"), productRoot: undefined },
  ],
  edges: [
    {
      from: "@p/http",
      to: "@p/db",
      subpath: "queries/orders",
      file: "prod/service/http/handlers/orders/list.ts",
      dev: false,
    },
    {
      from: "@p/http",
      to: "@p/db",
      subpath: "errors",
      file: "prod/service/http/handlers/users/get.ts",
      dev: false,
    },
    {
      from: "@p/billing-http",
      to: "@p/db",
      subpath: "errors",
      file: "prod/billing/billing-http/index.ts",
      dev: false,
    },
    {
      from: "@p/billing-http",
      to: "@p/http",
      subpath: "test/harness",
      file: "prod/billing/billing-http/x.test.ts",
      dev: true,
    },
    {
      from: "@p/http",
      to: "@fw/express",
      subpath: ".",
      file: "prod/service/http/handlers/users/get.ts",
      dev: false,
    },
  ],
};

describe("package map", () => {
  const map = productMap(graph);

  it("keeps product packages and counts runtime uses between them", () => {
    expect(map.packages.map((p) => [p.name, p.uses, p.usedBy])).toEqual([
      ["@p/http", ["@p/db"], []],
      ["@p/db", [], ["@p/billing-http", "@p/http"]],
      ["@p/billing-http", ["@p/db"], []],
    ]);
  });

  it("prints packages under their layer, core marked", () => {
    const text = formatProductMap(map);
    expect(text).toMatch(/FEATURE HTTP \/ SDK\n\s+service\*\s+http\s+http/);
    expect(text).toContain("DATA / CONTRACTS");
    expect(text).not.toContain("express");
  });

  it("details a package's imports, users, surface and directories", () => {
    const http = formatPackageDetail(graph, map, "http");
    expect(http).toContain("Uses 1 product packages at runtime");
    expect(http).toMatch(/billing-http \(tests only\)\s+1\s+test\/harness/);
    expect(http).toMatch(/handlers\/orders\s+120/);

    const db = formatPackageDetail(graph, map, "@p/db");
    expect(db).toMatch(/errors\s+10\s+http\(1\) billing-http\(1\)/);
    expect(formatPackageDetail(graph, map, "nope")).toContain(
      "No product package",
    );
  });
});
