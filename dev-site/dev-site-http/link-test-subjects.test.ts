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
      package_name: "@saflib/git",
      file_path: "saflib/git/log.ts",
      name: "log",
      kind: "function",
      signature: "(repo_root: string)",
      docstring: null,
    },
    {
      package_name: "@saflib/git",
      file_path: "saflib/git/read-blob.ts",
      name: "readBlobs",
      kind: "function",
      signature: "(repo_root: string, hashes: string[])",
      docstring: null,
    },
  ];

  it("links suite title to adjacent file export", () => {
    const tests: AnalyzedTestCase[] = [
      {
        package_name: "@saflib/git",
        file_path: "saflib/git/log.test.ts",
        full_name: "log > newest-first",
        subject_name: null,
        subject_signature: null,
        subject_docstring: null,
        subject_file_path: null,
        subject_confidence: null,
      },
    ];
    const [linked] = linkTestSubjects(tests, exports);
    expect(linked).toMatchObject({
      subject_name: "log",
      subject_signature: "(repo_root: string)",
      subject_file_path: "saflib/git/log.ts",
      subject_confidence: "adjacent",
    });
  });

  it("falls back to package-wide export match", () => {
    const tests: AnalyzedTestCase[] = [
      {
        package_name: "@saflib/git",
        file_path: "saflib/git/index.test.ts",
        full_name: "readBlobs > batch-reads",
        subject_name: null,
        subject_signature: null,
        subject_docstring: null,
        subject_file_path: null,
        subject_confidence: null,
      },
    ];
    const [linked] = linkTestSubjects(tests, exports);
    expect(linked).toMatchObject({
      subject_name: "readBlobs",
      subject_confidence: "package",
      subject_file_path: "saflib/git/read-blob.ts",
    });
  });

  it("leaves unmatched suites unlinked", () => {
    const tests: AnalyzedTestCase[] = [
      {
        package_name: "@saflib/git",
        file_path: "saflib/git/index.test.ts",
        full_name: "misc > does something",
        subject_name: null,
        subject_signature: null,
        subject_docstring: null,
        subject_file_path: null,
        subject_confidence: null,
      },
    ];
    const [linked] = linkTestSubjects(tests, exports);
    expect(linked.subject_name).toBeNull();
    expect(linked.subject_confidence).toBeNull();
  });
});
