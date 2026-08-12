import { describe, expect, it } from "vitest";
import {
  adjacentSourcePaths,
  linkTestSubjects,
} from "./link-test-subjects.ts";
import type { AnalyzedExport, AnalyzedTestCase } from "./analyze-commit.ts";

describe("adjacentSourcePaths", () => {
  it("maps foo.test.ts to sibling stems", () => {
    expect(adjacentSourcePaths("saflib/git/log.test.ts")).toContain(
      "saflib/git/log.ts",
    );
    expect(adjacentSourcePaths("src/math.spec.tsx")).toContain("src/math.ts");
  });

  it("returns empty for non-test paths", () => {
    expect(adjacentSourcePaths("saflib/git/log.ts")).toEqual([]);
  });
});

describe("linkTestSubjects", () => {
  const exports: AnalyzedExport[] = [
    {
      packageName: "@saflib/git",
      filePath: "saflib/git/log.ts",
      name: "log",
      kind: "function",
      signature: "(repoRoot: string)",
      docstring: null,
    },
    {
      packageName: "@saflib/git",
      filePath: "saflib/git/read-blob.ts",
      name: "readBlobs",
      kind: "function",
      signature: "(repoRoot: string, hashes: string[])",
      docstring: null,
    },
  ];

  it("links suite title to adjacent file export", () => {
    const tests: AnalyzedTestCase[] = [
      {
        packageName: "@saflib/git",
        filePath: "saflib/git/log.test.ts",
        fullName: "log > newest-first",
        subjectName: null,
        subjectSignature: null,
        subjectDocstring: null,
        subjectFilePath: null,
        subjectConfidence: null,
      },
    ];
    const [linked] = linkTestSubjects(tests, exports);
    expect(linked).toMatchObject({
      subjectName: "log",
      subjectSignature: "(repoRoot: string)",
      subjectFilePath: "saflib/git/log.ts",
      subjectConfidence: "adjacent",
    });
  });

  it("falls back to package-wide export match", () => {
    const tests: AnalyzedTestCase[] = [
      {
        packageName: "@saflib/git",
        filePath: "saflib/git/index.test.ts",
        fullName: "readBlobs > batch-reads",
        subjectName: null,
        subjectSignature: null,
        subjectDocstring: null,
        subjectFilePath: null,
        subjectConfidence: null,
      },
    ];
    const [linked] = linkTestSubjects(tests, exports);
    expect(linked).toMatchObject({
      subjectName: "readBlobs",
      subjectConfidence: "package",
      subjectFilePath: "saflib/git/read-blob.ts",
    });
  });

  it("leaves unmatched suites unlinked", () => {
    const tests: AnalyzedTestCase[] = [
      {
        packageName: "@saflib/git",
        filePath: "saflib/git/index.test.ts",
        fullName: "misc > does something",
        subjectName: null,
        subjectSignature: null,
        subjectDocstring: null,
        subjectFilePath: null,
        subjectConfidence: null,
      },
    ];
    const [linked] = linkTestSubjects(tests, exports);
    expect(linked.subjectName).toBeNull();
    expect(linked.subjectConfidence).toBeNull();
  });
});
