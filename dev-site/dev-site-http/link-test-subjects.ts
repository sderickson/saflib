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

function suiteTitles(fullName: string): string[] {
  const parts = fullName.split(" > ").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [];
  return parts.slice(0, -1);
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
    const list = byPackage.get(exp.packageName) ?? [];
    list.push(exp);
    byPackage.set(exp.packageName, list);
  }

  return tests.map((t) => {
    const titles = suiteTitles(t.fullName);
    if (titles.length === 0) {
      return {
        ...t,
        subjectName: null,
        subjectSignature: null,
        subjectFilePath: null,
        subjectConfidence: null,
      };
    }

    const pkgExports = byPackage.get(t.packageName) ?? [];
    const adjacent = new Set(adjacentSourcePaths(t.filePath));
    const adjacentExports = pkgExports.filter((e) => adjacent.has(e.filePath));

    // Innermost suite first (closest to the `it`).
    for (let i = titles.length - 1; i >= 0; i--) {
      const title = titles[i]!;
      const adjHit = adjacentExports.find((e) => e.name === title);
      if (adjHit) {
        return {
          ...t,
          subjectName: adjHit.name,
          subjectSignature: adjHit.signature,
          subjectFilePath: adjHit.filePath,
          subjectConfidence: "adjacent" as const,
        };
      }
    }
    for (let i = titles.length - 1; i >= 0; i--) {
      const title = titles[i]!;
      const pkgHit = pkgExports.find((e) => e.name === title);
      if (pkgHit) {
        return {
          ...t,
          subjectName: pkgHit.name,
          subjectSignature: pkgHit.signature,
          subjectFilePath: pkgHit.filePath,
          subjectConfidence: "package" as const,
        };
      }
    }

    return {
      ...t,
      subjectName: null,
      subjectSignature: null,
      subjectFilePath: null,
      subjectConfidence: null,
    };
  });
}
