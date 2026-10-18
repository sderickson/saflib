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
  kind?: string;
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
        ...(spec.kind ? { saf: { kind: spec.kind } } : {}),
        dependencies: asDeps(spec.deps),
        devDependencies: asDeps(spec.devDeps),
      }),
    );
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
      "cycle: @x/a -> @x/b -> @x/a",
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
    name: "@x/daemon-billing-http",
    dir: "/r/daemon/billing/http",
    relDir: "daemon/billing/http",
    kind: "http",
  };
  it.each([
    ["@x/daemon-*-http", true],
    ["@x/daemon-http", false],
    ["dir:daemon/**", true],
    ["dir:daemon/*", false],
    ["kind:http", true],
    ["kind:sdk", false],
  ])("%s → %s", (selector, expected) => {
    expect(matchesPackageSelector(selector, pkg)).toBe(expected);
  });
});

describe("findPackageCycles", () => {
  it("deduplicates rotations", () => {
    const graph = new Map([
      ["b", new Set(["a"])],
      ["a", new Set(["b"])],
    ]);
    expect(findPackageCycles(graph)).toEqual([["a", "b", "a"]]);
  });
});

describe("compareToBaseline", () => {
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
