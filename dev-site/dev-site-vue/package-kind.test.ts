import { describe, expect, it } from "vitest";
import { classifyPackageKind, PACKAGE_KIND_SURFACES } from "./package-kind.ts";
import { buildPackageTestTree } from "./test-tree.ts";

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

describe("buildPackageTestTree", () => {
  it("nests path, file, suite, and test", () => {
    const tree = buildPackageTestTree(
      [
        {
          packageName: "@fixture/root",
          filePath: "src/math.test.ts",
          fullName: "math > adds",
          subjectName: "math",
          subjectSignature: "(a: number, b: number)",
          subjectConfidence: "adjacent",
        },
        {
          packageName: "@fixture/root",
          filePath: "src/math.test.ts",
          fullName: "math > zero",
          subjectName: "math",
          subjectSignature: "(a: number, b: number)",
          subjectConfidence: "adjacent",
        },
        {
          packageName: "@other/pkg",
          filePath: "x.test.ts",
          fullName: "ignored",
        },
      ],
      "@fixture/root",
      "",
    );
    expect(tree).toHaveLength(1);
    expect(tree[0].kind).toBe("dir");
    expect(tree[0].label).toBe("src");
    const file = tree[0].children[0];
    expect(file.kind).toBe("file");
    expect(file.label).toBe("math.test.ts");
    expect(file.children[0].kind).toBe("suite");
    expect(file.children[0].label).toBe("math");
    expect(file.children[0].subjectSignature).toBe("(a: number, b: number)");
    expect(file.children[0].children.map((c) => c.label).sort()).toEqual([
      "adds",
      "zero",
    ]);
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
