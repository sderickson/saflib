import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkBoundaries,
  findPackageCycles,
  isDevFile,
} from "./check-boundaries.ts";
import { compareToBaseline } from "./baseline.ts";
import { matchesPackageSelector } from "./selectors.ts";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

type PkgSpec = {
  name: string;
  deps?: string[];
  devDeps?: string[];
  /** `saf.kind`; defaults to `lib`, `null` omits it. */
  kind?: string | null;
  /** Omit the default `tsconfig.json`. */
  noTsconfig?: boolean;
  files?: Record<string, string>;
};

function makeMonorepo(
  pkgs: Record<string, PkgSpec>,
  boundaries: Record<string, unknown> = {},
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "saf-boundaries-"));
  tempDirs.push(root);
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "tmp-monorepo",
      private: true,
      workspaces: ["packages/**"],
      safImports: { boundaries },
    }),
  );
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({ name: "tmp-monorepo", lockfileVersion: 3 }),
  );
  for (const [relDir, spec] of Object.entries(pkgs)) {
    const dir = path.join(root, relDir);
    fs.mkdirSync(dir, { recursive: true });
    const asDeps = (names: string[] = []) =>
      Object.fromEntries(names.map((n) => [n, "*"]));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: spec.name,
        ...(spec.kind === null ? {} : { saf: { kind: spec.kind ?? "lib" } }),
        dependencies: asDeps(spec.deps),
        devDependencies: asDeps(spec.devDeps),
      }),
    );
    if (!spec.noTsconfig)
      fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    for (const [file, body] of Object.entries(spec.files ?? {})) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), body);
    }
  }
  return root;
}

const keys = (root: string) =>
  checkBoundaries({ root }).violations.map((v) => v.key);

describe("checkBoundaries", () => {
  it("flags runtime imports missing from dependencies", () => {
    const root = makeMonorepo({
      "packages/a": {
        name: "@x/a",
        files: { "index.ts": 'import { b } from "@x/b/thing";\n' },
      },
      "packages/b": { name: "@x/b" },
    });
    expect(keys(root)).toEqual(["undeclared: @x/a -> @x/b"]);
  });

  it("accepts devDependencies for test files only", () => {
    const root = makeMonorepo({
      "packages/a": {
        name: "@x/a",
        devDeps: ["@x/b"],
        files: {
          "index.test.ts": 'import "@x/b";\n',
          "test/harness.ts": 'import "@x/b";\n',
          "index.ts": 'import "@x/b";\n',
        },
      },
      "packages/b": { name: "@x/b" },
    });
    const result = checkBoundaries({ root });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.key).toBe("undeclared: @x/a -> @x/b");
    expect(result.violations[0]!.files).toEqual(["packages/a/index.ts"]);
  });

  it("flags relative imports and $refs that leave the package", () => {
    const root = makeMonorepo({
      "packages/a": {
        name: "@x/a",
        files: {
          "src/ok.ts": 'import "../index.ts";\n',
          "src/bad.ts": 'import "../../b/index.ts";\n',
          "spec.yaml": '$ref: "../b/schemas/x.yaml#/X"\n$ref: "./local.yaml"\n',
        },
      },
      "packages/b": { name: "@x/b" },
    });
    expect(keys(root)).toEqual([
      "relative-escape: packages/a/spec.yaml -> ../b/schemas/x.yaml",
      "relative-escape: packages/a/src/bad.ts -> ../../b/index.ts",
    ]);
  });

  it("flags package.json imports maps that point outside the package", () => {
    const root = makeMonorepo({
      "packages/a": { name: "@x/a" },
      "packages/b": { name: "@x/b" },
    });
    const pjPath = path.join(root, "packages/a/package.json");
    const pj = JSON.parse(fs.readFileSync(pjPath, "utf8"));
    pj.imports = { "#ok/*": "./src/*", "#test/*": "../b/test/*" };
    fs.writeFileSync(pjPath, JSON.stringify(pj));
    expect(keys(root)).toEqual([
      "relative-escape: packages/a/package.json#imports #test/* -> ../b/test/*",
    ]);
  });

  it("flags TypeScript packages without a tsconfig.json", () => {
    const root = makeMonorepo({
      "packages/a": {
        name: "@x/a",
        noTsconfig: true,
        files: { "index.ts": "export {};\n" },
      },
      "packages/b": { name: "@x/b", files: { "index.ts": "export {};\n" } },
      "packages/c": {
        name: "@x/c",
        noTsconfig: true,
        files: { "spec.yaml": "a: 1\n" },
      },
    });
    expect(keys(root)).toEqual(["missing-tsconfig: @x/a"]);
  });

  it("does not attribute a nested package's files to its parent", () => {
    const root = makeMonorepo({
      "packages/a": { name: "@x/a" },
      "packages/a/inner": {
        name: "@x/inner",
        deps: ["@x/b"],
        files: { "index.ts": 'import "@x/b";\n' },
      },
      "packages/b": { name: "@x/b" },
    });
    expect(keys(root)).toEqual([]);
  });

  it("reports runtime cycles from declared deps and actual imports", () => {
    const root = makeMonorepo({
      "packages/a": { name: "@x/a", deps: ["@x/b"] },
      "packages/b": {
        name: "@x/b",
        files: { "index.ts": 'import "@x/a";\n' },
      },
    });
    expect(keys(root)).toEqual([
      "cycle: @x/a, @x/b",
      "undeclared: @x/b -> @x/a",
    ]);
  });

  it("ignores cycles that only exist through test files", () => {
    const root = makeMonorepo({
      "packages/a": { name: "@x/a", deps: ["@x/b"] },
      "packages/b": {
        name: "@x/b",
        devDeps: ["@x/a"],
        files: { "index.test.ts": 'import "@x/a";\n' },
      },
    });
    expect(keys(root)).toEqual([]);
  });

  it("applies forbidden-dependency rules to imports and declared deps", () => {
    const root = makeMonorepo(
      {
        "packages/integrations/mail": {
          name: "@x/mail",
          deps: ["@x/api-spec"],
          files: { "index.ts": 'import "@x/core-http";\n' },
        },
        "packages/api-spec": { name: "@x/api-spec" },
        "packages/core-http": { name: "@x/core-http" },
      },
      {
        rules: [
          {
            name: "integrations-no-api",
            from: ["dir:packages/integrations/*"],
            disallow: ["@x/*-spec", "@x/*-http"],
          },
        ],
      },
    );
    expect(keys(root)).toEqual([
      "forbidden(integrations-no-api): @x/mail -> @x/api-spec",
      "forbidden(integrations-no-api): @x/mail -> @x/core-http",
      "undeclared: @x/mail -> @x/core-http",
    ]);
  });

  it("limits a rule to the subpaths it lists", () => {
    const root = makeMonorepo(
      {
        "packages/integrations/mail": {
          name: "@x/mail",
          deps: ["@x/api-spec"],
          files: {
            "objects.ts":
              'import type { Foo } from "@x/api-spec/schemas/Foo";\n',
            "client.ts": 'import { jsonSpec } from "@x/api-spec/json-spec";\n',
          },
        },
        "packages/api-spec": { name: "@x/api-spec" },
      },
      {
        rules: [
          {
            name: "integrations-no-api",
            from: ["dir:packages/integrations/*"],
            disallow: ["@x/*-spec"],
            subpaths: [".", "json-spec", "operations/*"],
          },
        ],
      },
    );
    const result = checkBoundaries({ root });
    expect(result.violations.map((v) => [v.key, v.files])).toEqual([
      [
        "forbidden(integrations-no-api): @x/mail -> @x/api-spec",
        ["packages/integrations/mail/client.ts"],
      ],
    ]);
  });

  it("requires a known saf.kind", () => {
    const root = makeMonorepo({
      "packages/a": { name: "@x/a", kind: null },
      "packages/b": { name: "@x/b", kind: "widget" },
      "packages/c": { name: "@x/c", kind: "objects" },
    });
    expect(keys(root)).toEqual(["missing-kind: @x/a", "missing-kind: @x/b"]);
  });

  it("only checks packages in scope", () => {
    const root = makeMonorepo(
      {
        "packages/product/a": {
          name: "@x/a",
          files: { "index.ts": 'import "@x/lib";\n' },
        },
        "packages/lib": {
          name: "@x/lib",
          files: { "index.ts": 'import "@x/other";\n' },
        },
        "packages/other": { name: "@x/other" },
      },
      { scope: ["dir:packages/product/**"] },
    );
    expect(keys(root)).toEqual(["undeclared: @x/a -> @x/lib"]);
  });
});

describe("isDevFile", () => {
  it.each([
    ["foo.test.ts", true],
    ["requests/foo.fake.ts", true],
    ["requests/index.fakes.ts", true],
    ["client.mocks.ts", true],
    ["mocks.ts", true],
    ["test/slim-route-test.ts", true],
    ["bin/run.ts", true],
    ["vitest.config.js", true],
    ["handlers/foo.ts", false],
    ["contest/foo.ts", false],
  ])("%s → %s", (file, expected) => {
    expect(isDevFile(file)).toBe(expected);
  });
});

describe("matchesPackageSelector", () => {
  const pkg = {
    name: "@x/app-billing-http",
    dir: "/r/product/billing/http",
    relDir: "product/billing/http",
    kind: "http",
  };
  it.each([
    ["@x/app-*-http", true],
    ["@x/app-http", false],
    ["dir:product/**", true],
    ["dir:product/*", false],
    ["kind:http", true],
    ["kind:sdk", false],
  ])("%s → %s", (selector, expected) => {
    expect(matchesPackageSelector(selector, pkg)).toBe(expected);
  });
});

describe("findPackageCycles", () => {
  it("groups packages into strongly connected components", () => {
    const graph = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["a", "c"])],
      ["c", new Set(["d"])],
      ["d", new Set(["c"])],
      ["e", new Set(["a"])],
    ]);
    expect(findPackageCycles(graph)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("compareToBaseline", () => {
  it("accepts a cycle that shrank and reports the old key as stale", () => {
    const cycle = {
      kind: "cycle" as const,
      key: "cycle: a, b",
      message: "",
      files: [],
    };
    expect(
      compareToBaseline([cycle], { violations: ["cycle: a, b, c"] }),
    ).toEqual({ added: [], stale: ["cycle: a, b, c"] });
  });

  it("splits new violations from fixed baseline entries", () => {
    const v = (key: string) => ({
      kind: "cycle" as const,
      key,
      message: key,
      files: [],
    });
    expect(
      compareToBaseline([v("kept"), v("new")], {
        violations: ["kept", "fixed"],
      }),
    ).toEqual({ added: [v("new")], stale: ["fixed"] });
  });
});

describe("layer rules", () => {
  const layerKeys = (root: string) =>
    keys(root).filter((k) => k.startsWith("layer("));

  it("flags imports that go up a layer, and allows ones that go down", () => {
    const root = makeMonorepo({
      "packages/service/db": {
        name: "@p/db",
        kind: "db",
        deps: ["@p/objects"],
        files: { "index.ts": `import "@p/objects";` },
      },
      "packages/service/objects": { name: "@p/objects", kind: "objects" },
      "packages/service/spec": {
        name: "@p/spec",
        kind: "spec",
        deps: ["@p/objects"],
        files: { "index.ts": `import "@p/objects";` },
      },
      "packages/service/common": {
        name: "@p/common",
        kind: "domain",
        deps: ["@p/db", "@p/spec"],
        files: { "index.ts": `import "@p/db";\nimport "@p/spec";` },
      },
    });
    expect(layerKeys(root)).toEqual(["layer(order): @p/common -> @p/spec"]);
  });

  it("lets anything use lib/other packages except objects", () => {
    const root = makeMonorepo({
      "packages/service/util": { name: "@p/util", kind: "lib" },
      "packages/service/db": {
        name: "@p/db",
        kind: "db",
        deps: ["@p/util"],
        files: { "index.ts": `import "@p/util";` },
      },
      "packages/service/objects": {
        name: "@p/objects",
        kind: "objects",
        deps: ["@p/util"],
        files: { "index.ts": `import "@p/util";` },
      },
    });
    expect(layerKeys(root)).toEqual(["layer(order): @p/objects -> @p/util"]);
  });

  it("forbids siblings across features, but lets offshoots use the core below http (D2)", () => {
    const root = makeMonorepo({
      "packages/service/http": { name: "@p/http", kind: "http" },
      "packages/service/db": { name: "@p/db", kind: "db" },
      "packages/billing/http": {
        name: "@p/billing-http",
        kind: "http",
        deps: ["@p/http", "@p/billing-db"],
        files: { "index.ts": `import "@p/http";\nimport "@p/billing-db";` },
      },
      "packages/billing/db": {
        name: "@p/billing-db",
        kind: "db",
        deps: ["@p/db"],
        files: { "index.ts": `import "@p/db";` },
      },
    });
    const found = checkBoundaries({ root }).violations.filter(
      (v) => v.kind === "layer",
    );
    expect(found.map((v) => v.key)).toEqual([
      "layer(siblings): @p/billing-http -> @p/http",
    ]);
    expect(found[0]!.message).toContain("http-common");
  });

  it("forbids the core from importing an offshoot, except db schema re-exports", () => {
    const root = makeMonorepo({
      "packages/service/db": {
        name: "@p/db",
        kind: "db",
        deps: ["@p/billing-db"],
        files: {
          "schema.ts": `export * from "@p/billing-db/schemas/invoice";`,
          "queries.ts": `import { x } from "@p/billing-db/queries/list";`,
        },
      },
      "packages/service/common": {
        name: "@p/common",
        kind: "domain",
        deps: ["@p/billing-db"],
        files: { "index.ts": `import "@p/billing-db";` },
      },
      "packages/service/monolith": {
        name: "@p/monolith",
        kind: "app",
        deps: ["@p/billing-db"],
        files: { "index.ts": `import "@p/billing-db";` },
      },
      "packages/service/spec": {
        name: "@p/spec",
        kind: "spec",
        deps: ["@p/billing-objects"],
        files: { "index.ts": `import "@p/billing-objects";` },
      },
      "packages/billing/db": { name: "@p/billing-db", kind: "db" },
      "packages/billing/objects": {
        name: "@p/billing-objects",
        kind: "objects",
      },
    });
    expect(layerKeys(root)).toEqual([
      "layer(core-offshoot): @p/common -> @p/billing-db",
      "layer(core-offshoot): @p/db -> @p/billing-db",
    ]);
    const db = checkBoundaries({ root }).violations.find(
      (v) => v.key === "layer(core-offshoot): @p/db -> @p/billing-db",
    )!;
    expect(db.files).toEqual(["packages/service/db/queries.ts"]);
  });

  it("only lets test files import test packages", () => {
    const root = makeMonorepo({
      "packages/service/test": { name: "@p/test", kind: "test" },
      "packages/service/db": {
        name: "@p/db",
        kind: "db",
        deps: ["@p/test"],
        files: {
          "index.ts": `import "@p/test";`,
          "index.test.ts": `import "@p/test";`,
        },
      },
    });
    expect(layerKeys(root)).toEqual(["layer(test-dev-only): @p/db -> @p/test"]);
  });

  it("keeps an integration's client code away from the database and state/", () => {
    const root = makeMonorepo({
      "packages/service/db": { name: "@p/db", kind: "db" },
      "packages/service/integrations/mail": {
        name: "@p/mail",
        kind: "integration",
        deps: ["@p/db"],
        files: {
          "client.ts": `import "./state/tokens.ts";`,
          "calls/send.ts": `import "@p/db";`,
          "state/tokens.ts": `import "@p/db";`,
        },
      },
    });
    expect(layerKeys(root)).toEqual([
      "layer(integration-internals): @p/mail/calls/send.ts -> @p/db",
      "layer(integration-internals): @p/mail/client.ts -> state/tokens.ts",
    ]);
  });

  it("only layers packages within one product", () => {
    const root = makeMonorepo({
      "packages/framework/express": { name: "@fw/express", kind: "http" },
      "packages/product/service/db": {
        name: "@p/db",
        kind: "db",
        deps: ["@fw/express"],
        files: { "index.ts": `import "@fw/express";` },
      },
    });
    expect(layerKeys(root)).toEqual([]);
  });

  it("can be turned off", () => {
    const root = makeMonorepo(
      {
        "packages/service/db": {
          name: "@p/db",
          kind: "db",
          deps: ["@p/spec"],
          files: { "index.ts": `import "@p/spec";` },
        },
        "packages/service/spec": { name: "@p/spec", kind: "spec" },
      },
      { layers: false },
    );
    expect(layerKeys(root)).toEqual([]);
  });

  it("honors saf.feature", () => {
    const root = makeMonorepo({
      "packages/service/http": { name: "@p/http", kind: "http" },
      "packages/service/admin-http": {
        name: "@p/admin-http",
        kind: "http",
        deps: ["@p/http"],
        files: { "index.ts": `import "@p/http";` },
      },
    });
    expect(layerKeys(root)).toEqual([]);
    const pj = path.join(root, "packages/service/admin-http/package.json");
    const json = JSON.parse(fs.readFileSync(pj, "utf8"));
    json.saf.feature = "admin";
    fs.writeFileSync(pj, JSON.stringify(json));
    expect(layerKeys(root)).toEqual([
      "layer(siblings): @p/admin-http -> @p/http",
    ]);
  });
});
