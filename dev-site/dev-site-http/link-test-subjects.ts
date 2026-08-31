import type { AnalyzedExport, AnalyzedTestCase } from "./analyze-commit.ts";

export type SubjectConfidence = "adjacent" | "package";

const TEST_FILE_RE = /\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/i;

/**
 * Map `foo.test.ts` / `foo.spec.tsx` → candidate sibling implementation paths
 * (`foo.ts`, `foo.tsx`, …). Returns [] when the path is not a conventional test file.
 */
export function adjacentSourcePaths(testFilePath: string): string[] {
  const m = testFilePath.match(TEST_FILE_RE);
  if (!m) return [];
  const stem = testFilePath.slice(0, -m[0].length);
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue"];
  return exts.map((ext) => `${stem}${ext}`);
}

function suiteTitles(full_name: string): string[] {
  const parts = full_name.split(" > ").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [];
  return parts.slice(0, -1);
}

function unlink(t: AnalyzedTestCase): AnalyzedTestCase {
  return {
    ...t,
    subject_name: null,
    subject_signature: null,
    subject_docstring: null,
    subject_file_path: null,
    subject_confidence: null,
  };
}

function linkTo(t: AnalyzedTestCase, exp: AnalyzedExport, confidence: SubjectConfidence): AnalyzedTestCase {
  return {
    ...t,
    subject_name: exp.name,
    subject_signature: exp.signature,
    subject_docstring: exp.docstring,
    subject_file_path: exp.file_path,
    subject_confidence: confidence,
  };
}

/**
 * Soft-link each test case to an exported symbol by convention:
 * 1. Suite title matches an export in an adjacent source file (strong).
 * 2. Else suite title matches an export elsewhere in the same package (weaker).
 *
 * Innermost matching suite wins. Leaves (`it` titles) are never used as subjects.
 */
export function linkTestSubjects(
  tests: AnalyzedTestCase[],
  exports: AnalyzedExport[],
): AnalyzedTestCase[] {
  const byPackage = new Map<string, AnalyzedExport[]>();
  for (const exp of exports) {
    const list = byPackage.get(exp.package_name) ?? [];
    list.push(exp);
    byPackage.set(exp.package_name, list);
  }

  return tests.map((t) => {
    const titles = suiteTitles(t.full_name);
    if (titles.length === 0) return unlink(t);

    const pkgExports = byPackage.get(t.package_name) ?? [];
    const adjacent = new Set(adjacentSourcePaths(t.file_path));
    const adjacentExports = pkgExports.filter((e) => adjacent.has(e.file_path));

    for (let i = titles.length - 1; i >= 0; i--) {
      const title = titles[i]!;
      const adjHit = adjacentExports.find((e) => e.name === title);
      if (adjHit) return linkTo(t, adjHit, "adjacent");
    }
    for (let i = titles.length - 1; i >= 0; i--) {
      const title = titles[i]!;
      const pkgHit = pkgExports.find((e) => e.name === title);
      if (pkgHit) return linkTo(t, pkgHit, "package");
    }

    return unlink(t);
  });
}
