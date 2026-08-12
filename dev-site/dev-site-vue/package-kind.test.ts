import { describe, expect, it } from "vitest";
import { classifyPackageKind, PACKAGE_KIND_SURFACES } from "./package-kind.ts";
import { buildPackageTestTree, buildTestFileNav } from "./test-tree.ts";

describe("classifyPackageKind", () => {
  it("classifies common saflib suffixes", () => {
    expect(classifyPackageKind("@saflib/dev-site-db", "saflib/dev-site/dev-site-db")).toBe(
      "db",
    );
    expect(
      classifyPackageKind("@saflib/dev-site-http", "saflib/dev-site/dev-site-http"),
    ).toBe("http");
    expect(
      classifyPackageKind("@saflib/dev-site-spec", "saflib/dev-site/dev-site-spec"),
    ).toBe("spec");
    expect(
      classifyPackageKind("@saflib/dev-site-vue", "saflib/dev-site/dev-site-vue"),
    ).toBe("spa");
    expect(classifyPackageKind("@saflib/backup-sdk", "saflib/backup/backup-sdk")).toBe(
      "sdk",
    );
    expect(classifyPackageKind("@saflib/git", "saflib/git")).toBe("lib");
  });

  it("lists future surfaces per kind", () => {
    expect(PACKAGE_KIND_SURFACES.http).toContain("Routes");
    expect(PACKAGE_KIND_SURFACES.lib).toContain("Exports");
  });
});

const fixtureTests = [
  {
    packageName: "@fixture/root",
    filePath: "src/math.test.ts",
    fullName: "math > adds",
    subjectName: "math",
    subjectSignature: "(a: number, b: number)",
    subjectConfidence: "adjacent" as const,
  },
  {
    packageName: "@fixture/root",
    filePath: "src/math.test.ts",
    fullName: "math > zero",
    subjectName: "math",
    subjectSignature: "(a: number, b: number)",
    subjectConfidence: "adjacent" as const,
  },
  {
    packageName: "@fixture/root",
    filePath: "src/util/fmt.test.ts",
    fullName: "fmt > pads",
  },
  {
    packageName: "@other/pkg",
    filePath: "x.test.ts",
    fullName: "ignored",
  },
];

describe("buildTestFileNav", () => {
  it("lists dirs and test files only", () => {
    const nav = buildTestFileNav(fixtureTests, "@fixture/root", "");
    expect(nav).toHaveLength(1);
    expect(nav[0]).toMatchObject({ kind: "dir", label: "src", localPath: "src" });
    expect(nav[0].children.map((c) => c.label).sort()).toEqual([
      "math.test.ts",
      "util",
    ]);
    const util = nav[0].children.find((c) => c.label === "util")!;
    expect(util.kind).toBe("dir");
    expect(util.children[0]).toMatchObject({
      kind: "file",
      label: "fmt.test.ts",
      localPath: "src/util/fmt.test.ts",
    });
  });
});

describe("buildPackageTestTree", () => {
  it("nests path, file, suite, and test", () => {
    const tree = buildPackageTestTree(fixtureTests, "@fixture/root", "");
    expect(tree).toHaveLength(1);
    expect(tree[0].kind).toBe("dir");
    expect(tree[0].label).toBe("src");
    const mathFile = tree[0].children.find((c) => c.label === "math.test.ts")!;
    expect(mathFile.kind).toBe("file");
    expect(mathFile.children[0].kind).toBe("suite");
    expect(mathFile.children[0].label).toBe("math");
    expect(mathFile.children[0].subjectSignature).toBe("(a: number, b: number)");
    expect(mathFile.children[0].children.map((c) => c.label).sort()).toEqual([
      "adds",
      "zero",
    ]);
    for (const leaf of mathFile.children[0].children) {
      expect(leaf.kind).toBe("test");
      expect(leaf.subjectSignature).toBeUndefined();
    }
  });

  it("scopes to a single file without file wrapper", () => {
    const tree = buildPackageTestTree(fixtureTests, "@fixture/root", "", "", {
      kind: "file",
      localPath: "src/math.test.ts",
    });
    expect(tree).toHaveLength(1);
    expect(tree[0].kind).toBe("suite");
    expect(tree[0].label).toBe("math");
    expect(tree[0].children).toHaveLength(2);
  });

  it("scopes to a directory", () => {
    const tree = buildPackageTestTree(fixtureTests, "@fixture/root", "", "", {
      kind: "dir",
      localPath: "src/util",
    });
    expect(tree).toHaveLength(1);
    expect(tree[0].kind).toBe("file");
    expect(tree[0].label).toBe("fmt.test.ts");
  });

  it("strips package directory prefix", () => {
    const tree = buildPackageTestTree(
      [
        {
          packageName: "@saflib/git",
          filePath: "saflib/git/index.test.ts",
          fullName: "log > newest-first",
        },
      ],
      "@saflib/git",
      "saflib/git",
    );
    expect(tree[0].kind).toBe("file");
    expect(tree[0].label).toBe("index.test.ts");
  });
});
