import {
  isAncestor,
  listRefs,
  listTree,
  readBlob,
  type GitCommit,
} from "@saflib/git";
import type { AnalyzedCommitRef } from "@saflib/dev-site-db/types";
import type { InsertExportParams } from "@saflib/dev-site-db/types";
import type { InsertPackageMetricsParams } from "@saflib/dev-site-db/types";
import type { InsertTestCaseParams } from "@saflib/dev-site-db/types";
import { extractExports, extractTestCases } from "@saflib/parser";
import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import {
  countLines,
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
} from "./classify.ts";

export const ANALYZER_VERSION = "1";

export interface AnalyzeCommitOptions {
  repoRoot: string;
  /** Limit analysis to paths under this prefix (e.g. `daemon`). Empty = whole repo. */
  productRoot?: string;
  /** Main branch ref for isMainAncestor. Defaults to `main`. */
  mainRef?: string;
}

export interface AnalyzedSnapshot {
  parentHashes: string[];
  authoredAt: Date;
  message: string;
  refs: AnalyzedCommitRef[];
  analyzerVersion: string;
  packageMetrics: Omit<InsertPackageMetricsParams, "commitHash">[];
  exports: Omit<InsertExportParams, "commitHash">[];
  testCases: Omit<InsertTestCaseParams, "commitHash">[];
}

export type AnalyzeCommitError = GitCommandError;

function underProductRoot(path: string, productRoot: string): boolean {
  if (!productRoot) return true;
  return path === productRoot || path.startsWith(productRoot + "/");
}

function stripProductRoot(path: string, productRoot: string): string {
  if (!productRoot) return path;
  if (path === productRoot) return "";
  if (path.startsWith(productRoot + "/")) {
    return path.slice(productRoot.length + 1);
  }
  return path;
}

/**
 * Build a full static-analysis snapshot for one commit from git plumbing only.
 */
export function analyzeCommit(
  commit: GitCommit,
  options: AnalyzeCommitOptions,
): ReturnsError<AnalyzedSnapshot, AnalyzeCommitError> {
  const repoRoot = options.repoRoot;
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");
  const mainRef = options.mainRef ?? "main";

  const treeResult = listTree(repoRoot, commit.hash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) =>
    underProductRoot(e.path, productRoot),
  );

  const refsResult = listRefs(repoRoot);
  if (refsResult.error) return { error: refsResult.error };
  const ancestorResult = isAncestor(repoRoot, commit.hash, mainRef);
  const isMainAncestor =
    ancestorResult.error ? false : (ancestorResult.result ?? false);

  const refs: AnalyzedCommitRef[] = refsResult.result
    .filter((r) => r.hash === commit.hash)
    .map((r) => ({
      name: r.name,
      type: r.type,
      isMainAncestor,
    }));

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const nameByPath = new Map<string, string>();
  for (const entry of packageJsonEntries) {
    const blob = readBlob(repoRoot, entry.blobHash);
    if (blob.error) continue;
    const name = parsePackageName(blob.result);
    if (name) nameByPath.set(entry.path, name);
  }
  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );

  type Agg = {
    packageName: string;
    directory: string;
    sourceFiles: number;
    sourceLines: number;
    prodLines: number;
    testLines: number;
    testFiles: number;
  };
  const byPackage = new Map<string, Agg>();
  const exportsOut: AnalyzedSnapshot["exports"] = [];
  const testCasesOut: AnalyzedSnapshot["testCases"] = [];

  for (const entry of tree) {
    if (!isSourcePath(entry.path)) continue;
    const fileName = entry.path.split("/").pop() ?? entry.path;
    const isTest = isTestSourcePath(entry.path, fileName);
    const pkg = packageForPath(entry.path, roots);
    const key = pkg.directory || "(root)";
    const agg = byPackage.get(key) ?? {
      packageName: pkg.packageName,
      directory: stripProductRoot(pkg.directory, productRoot) || pkg.directory,
      sourceFiles: 0,
      sourceLines: 0,
      prodLines: 0,
      testLines: 0,
      testFiles: 0,
    };

    const blob = readBlob(repoRoot, entry.blobHash);
    if (blob.error) continue;
    const source = blob.result;
    const lines = countLines(source);

    agg.sourceFiles += 1;
    agg.sourceLines += lines;
    if (isTest) {
      agg.testFiles += 1;
      agg.testLines += lines;
      for (const tc of extractTestCases(source)) {
        testCasesOut.push({
          packageName: pkg.packageName,
          filePath: entry.path,
          fullName: tc.fullName,
        });
      }
    } else {
      agg.prodLines += lines;
      for (const exp of extractExports(source)) {
        exportsOut.push({
          packageName: pkg.packageName,
          filePath: entry.path,
          name: exp.name,
          kind: exp.kind,
        });
      }
    }
    byPackage.set(key, agg);
  }

  return {
    result: {
      parentHashes: commit.parentHashes,
      authoredAt: new Date(commit.authoredAt),
      message: commit.subject,
      refs,
      analyzerVersion: ANALYZER_VERSION,
      packageMetrics: [...byPackage.values()],
      exports: exportsOut,
      testCases: testCasesOut,
    },
  };
}
