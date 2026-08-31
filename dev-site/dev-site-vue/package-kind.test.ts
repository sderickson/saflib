import { describe, expect, it } from "vitest";
import { classifyPackageKind, PACKAGE_KIND_SURFACES } from "./package-kind.ts";
import { buildPackageTestTree, buildTestFileNav } from "./test-tree.ts";

describe("classifyPackageKind", () => {
  it("coerces API kind strings", () => {
    expect(classifyPackageKind("db")).toBe("db");
    expect(classifyPackageKind("http")).toBe("http");
    expect(classifyPackageKind("spec")).toBe("spec");
    expect(classifyPackageKind("sdk")).toBe("sdk");
    expect(classifyPackageKind("spa")).toBe("spa");
    expect(classifyPackageKind("lib")).toBe("lib");
    expect(classifyPackageKind("integration")).toBe("integration");
    expect(classifyPackageKind(undefined)).toBe("other");
    expect(classifyPackageKind("nope")).toBe("other");
  });

  it("lists future surfaces per kind", () => {
    expect(PACKAGE_KIND_SURFACES.http).toContain("Routes");
    expect(PACKAGE_KIND_SURFACES.spec).toContain("Objects / routes");
    expect(PACKAGE_KIND_SURFACES.lib).toContain("Exports");
  });
});

const fixtureTests = [
  {
    package_name: "@fixture/root",
    file_path: "src/math.test.ts",
    full_name: "math > adds",
    subject_name: "math",
    subject_signature: "(a: number, b: number)",
    subject_confidence: "adjacent" as const,
  },
  {
    package_name: "@fixture/root",
    file_path: "src/math.test.ts",
    full_name: "math > zero",
    subject_name: "math",
    subject_signature: "(a: number, b: number)",
    subject_confidence: "adjacent" as const,
  },
  {
    package_name: "@fixture/root",
    file_path: "src/util/fmt.test.ts",
    full_name: "fmt > pads",
  },
  {
    package_name: "@other/pkg",
    file_path: "x.test.ts",
    full_name: "ignored",
  },
];

describe("buildTestFileNav", () => {
  it("lists dirs and module stems only", () => {
    const nav = buildTestFileNav(fixtureTests, "@fixture/root", "");
    expect(nav).toHaveLength(1);
    expect(nav[0]).toMatchObject({ kind: "dir", label: "src", localPath: "src" });
    expect(nav[0].children.map((c) => c.label).sort()).toEqual([
      "math",
      "util",
    ]);
    const util = nav[0].children.find((c) => c.label === "util")!;
    expect(util.kind).toBe("dir");
    expect(util.children[0]).toMatchObject({
      kind: "file",
      label: "fmt",
      localPath: "src/util/fmt",
    });
  });
});

describe("buildPackageTestTree", () => {
  it("nests path, file, suite, and test", () => {
    const tree = buildPackageTestTree(fixtureTests, "@fixture/root", "");
    expect(tree).toHaveLength(1);
    expect(tree[0].kind).toBe("dir");
    expect(tree[0].label).toBe("src");
    const mathFile = tree[0].children.find((c) => c.label === "math")!;
    expect(mathFile.kind).toBe("file");
    expect(mathFile.sourcePath).toBe("src/math.test.ts");
    expect(mathFile.children[0].kind).toBe("suite");
    expect(mathFile.children[0].label).toBe("math");
    expect(mathFile.children[0].subject_signature).toBe("(a: number, b: number)");
    expect(mathFile.children[0].children.map((c) => c.label).sort()).toEqual([
      "adds",
      "zero",
    ]);
    for (const leaf of mathFile.children[0].children) {
      expect(leaf.kind).toBe("test");
      expect(leaf.subject_signature).toBeUndefined();
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
    expect(tree[0].label).toBe("fmt");
  });

  it("strips package directory prefix", () => {
    const tree = buildPackageTestTree(
      [
        {
          package_name: "@saflib/git",
          file_path: "saflib/git/index.test.ts",
          full_name: "log > newest-first",
        },
      ],
      "@saflib/git",
      "saflib/git",
    );
    expect(tree[0].kind).toBe("file");
    expect(tree[0].label).toBe("index");
  });
});
