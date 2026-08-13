import {
  isAncestor,
  listRefs,
  listTree,
  readBlobs,
  type GitCommit,
} from "@saflib/git";
import type { DbKey } from "@saflib/drizzle";
import type { AnalyzedCommitRef, BlobFactEntity, BlobSpecialty, InsertBlobFactParams, InsertPackageMetricsParams } from "@saflib/dev-site-db/types";
import {
  blobFactExports,
  blobFactTestCases,
} from "@saflib/dev-site-db/types";

import {
  extractDrizzleTables,
  extractExports,
  extractImports,
  extractTestCases,
} from "@saflib/parser";
import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { makeSubsystemReporters } from "@saflib/node";
import {
  countLines,
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
} from "./classify.ts";
import { linkTestSubjects } from "./link-test-subjects.ts";

import { getByHashes } from "@saflib/dev-site-db/queries/blob-facts/get-by-hashes";
import { upsertMany } from "@saflib/dev-site-db/queries/blob-facts/upsert-many";
export const ANALYZER_VERSION = "7";

export interface AnalyzeCommitOptions {
  repoRoot: string;
  /** Limit analysis to paths under this prefix (e.g. `products`). Empty = whole repo. */
  productRoot?: string;
  /** Main branch ref for isMainAncestor. Defaults to `main`. */
  mainRef?: string;
}

export interface AnalyzedExport {
  packageName: string;
  filePath: string;
  name: string;
  kind: InsertBlobFactParams["specialty"]["exports"][number]["kind"];
  signature: string | null;
  docstring: string | null;
}

export interface AnalyzedTestCase {
  packageName: string;
  filePath: string;
  fullName: string;
  subjectName: string | null;
  subjectSignature: string | null;
  subjectDocstring: string | null;
  subjectFilePath: string | null;
  subjectConfidence: "adjacent" | "package" | null;
}

export interface AnalyzedSnapshot {
  parentHashes: string[];
  authoredAt: Date;
  message: string;
  refs: AnalyzedCommitRef[];
  analyzerVersion: string;
  packageMetrics: Omit<InsertPackageMetricsParams, "commitHash">[];
  exports: AnalyzedExport[];
  testCases: AnalyzedTestCase[];
  exportCount: number;
  testCaseCount: number;
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

function buildSpecialty(source: string): BlobSpecialty {
  const exports = extractExports(source).map((e) => ({
    name: e.name,
    kind: e.kind,
    signature: e.signature,
    docstring: e.docstring,
  }));
  const imports = extractImports(source).map((i) => ({
    specifier: i.specifier,
    names: i.names,
  }));
  const tables = extractDrizzleTables(source).map((t) => ({
    exportName: t.exportName,
    tableName: t.tableName,
    docstring: t.docstring,
    columns: t.columns.map((c) => ({
      propName: c.propName,
      sqlName: c.sqlName,
      typeKind: c.typeKind,
      docstring: c.docstring,
    })),
  }));
  if (tables.length > 0) {
    return { kind: "sql-table", exports, imports, tables };
  }
  const testCases = extractTestCases(source).map((t) => ({
    fullName: t.fullName,
  }));
  if (testCases.length > 0) {
    return { kind: "test", exports, imports, testCases };
  }
  return { kind: "source", exports, imports };
}

/** Parse exports/imports(/tests/tables) from source text — no git or DB. */
export function parseSourceSpecialty(source: string): BlobSpecialty {
  return buildSpecialty(source);
}

function parseBlobFact(
  blobHash: string,
  source: string,
): InsertBlobFactParams {
  return {
    blobHash,
    analyzerVersion: ANALYZER_VERSION,
    lineCount: countLines(source),
    specialty: buildSpecialty(source),
    computedAt: new Date(),
  };
}

/**
 * Ensure blob_facts rows exist for the given hashes (current analyzer version).
 * Returns a map of blobHash → fact.
 */
export async function ensureBlobFacts(
  dbKey: DbKey,
  repoRoot: string,
  blobHashes: string[],
): Promise<ReturnsError<Map<string, BlobFactEntity>, GitCommandError>> {
  const unique = [...new Set(blobHashes)];
  const existing = (await getByHashes(dbKey, unique)).result!;
  const byHash = new Map<string, BlobFactEntity>();
  for (const row of existing) {
    if (row.analyzerVersion === ANALYZER_VERSION) {
      byHash.set(row.blobHash, row);
    }
  }

  const missing = unique.filter((h) => !byHash.has(h));
  if (missing.length === 0) {
    return { result: byHash };
  }

  const { log: analyzeLog } = makeSubsystemReporters("http", "analyze");
  analyzeLog.info(
    `Parsing ${missing.length} new blob(s) (${unique.length - missing.length} cached of ${unique.length})`,
  );
  const parseStarted = Date.now();

  const blobs = readBlobs(repoRoot, missing);
  if (blobs.error) return { error: blobs.error };

  const toUpsert: InsertBlobFactParams[] = [];
  const progressEvery = Math.max(25, Math.ceil(missing.length / 10));
  for (let i = 0; i < missing.length; i++) {
    const hash = missing[i]!;
    const source = blobs.result.get(hash);
    if (source === undefined) continue;
    toUpsert.push(parseBlobFact(hash, source));
    if ((i + 1) % progressEvery === 0 || i + 1 === missing.length) {
      analyzeLog.info(`Parsed blobs ${i + 1}/${missing.length}`);
    }
  }
  if (toUpsert.length > 0) {
    await upsertMany(dbKey, toUpsert);
    for (const row of toUpsert) {
      byHash.set(row.blobHash, row);
    }
  }
  analyzeLog.info(
    `Blob facts ready: ${toUpsert.length} upserted in ${Date.now() - parseStarted}ms`,
  );
  return { result: byHash };
}

/**
 * Build a full static-analysis snapshot for one commit from git plumbing + blob_facts.
 */
export async function analyzeCommit(
  dbKey: DbKey,
  commit: GitCommit,
  options: AnalyzeCommitOptions,
): Promise<ReturnsError<AnalyzedSnapshot, AnalyzeCommitError>> {
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
  const pkgBlobHashes = packageJsonEntries.map((e) => e.blobHash);
  const pkgBlobs = readBlobs(repoRoot, pkgBlobHashes);
  if (pkgBlobs.error) return { error: pkgBlobs.error };

  const nameByPath = new Map<string, string>();
  for (const entry of packageJsonEntries) {
    const text = pkgBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const name = parsePackageName(text);
    if (name) nameByPath.set(entry.path, name);
  }
  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );

  const sourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repoRoot,
    sourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

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
  const exportsOut: AnalyzedExport[] = [];
  const testCasesOut: AnalyzedTestCase[] = [];

  for (const entry of sourceEntries) {
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;

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

    agg.sourceFiles += 1;
    agg.sourceLines += fact.lineCount;
    if (isTest) {
      agg.testFiles += 1;
      agg.testLines += fact.lineCount;
      for (const tc of blobFactTestCases(fact)) {
        testCasesOut.push({
          packageName: pkg.packageName,
          filePath: entry.path,
          fullName: tc.fullName,
          subjectName: null,
          subjectSignature: null,
          subjectDocstring: null,
          subjectFilePath: null,
          subjectConfidence: null,
        });
      }
    } else {
      agg.prodLines += fact.lineCount;
      for (const exp of blobFactExports(fact)) {
        exportsOut.push({
          packageName: pkg.packageName,
          filePath: entry.path,
          name: exp.name,
          kind: exp.kind,
          signature: exp.signature ?? null,
          docstring: exp.docstring ?? null,
        });
      }
    }
    byPackage.set(key, agg);
  }

  exportsOut.sort((a, b) =>
    `${a.packageName}\0${a.filePath}\0${a.name}\0${a.kind}`.localeCompare(
      `${b.packageName}\0${b.filePath}\0${b.name}\0${b.kind}`,
    ),
  );

  const linkedTests = linkTestSubjects(testCasesOut, exportsOut);
  linkedTests.sort((a, b) =>
    `${a.packageName}\0${a.filePath}\0${a.fullName}`.localeCompare(
      `${b.packageName}\0${b.filePath}\0${b.fullName}`,
    ),
  );

  return {
    result: {
      parentHashes: commit.parentHashes,
      authoredAt: new Date(commit.authoredAt),
      message: commit.subject,
      refs,
      analyzerVersion: ANALYZER_VERSION,
      packageMetrics: [...byPackage.values()],
      exports: exportsOut,
      testCases: linkedTests,
      exportCount: exportsOut.length,
      testCaseCount: linkedTests.length,
    },
  };
}

/**
 * Reassemble exports/tests for an already-analyzed commit from live ls-tree + blob_facts.
 * Self-heals missing blob_facts by parsing on demand.
 */
export async function assembleCommitSymbols(
  dbKey: DbKey,
  commitHash: string,
  options: AnalyzeCommitOptions,
): Promise<
  ReturnsError<
    { exports: AnalyzedExport[]; testCases: AnalyzedTestCase[] },
    AnalyzeCommitError
  >
> {
  const synthetic: GitCommit = {
    hash: commitHash,
    parentHashes: [],
    authoredAt: new Date(0).toISOString(),
    subject: "",
  };
  const snap = await analyzeCommit(dbKey, synthetic, options);
  if (snap.error) return { error: snap.error };
  return {
    result: {
      exports: snap.result.exports,
      testCases: snap.result.testCases,
    },
  };
}

/**
 * Like {@link assembleCommitSymbols} but only for one package — much cheaper
 * for the checkout package panel (skips blob-fact work for other packages).
 */
export async function assemblePackageSymbols(
  dbKey: DbKey,
  commitHash: string,
  packageName: string,
  options: AnalyzeCommitOptions,
): Promise<
  ReturnsError<
    { exports: AnalyzedExport[]; testCases: AnalyzedTestCase[] },
    AnalyzeCommitError
  >
> {
  const repoRoot = options.repoRoot;
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");

  const treeResult = listTree(repoRoot, commitHash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) =>
    underProductRoot(e.path, productRoot),
  );

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const pkgBlobHashes = packageJsonEntries.map((e) => e.blobHash);
  const pkgBlobs = readBlobs(repoRoot, pkgBlobHashes);
  if (pkgBlobs.error) return { error: pkgBlobs.error };

  const nameByPath = new Map<string, string>();
  for (const entry of packageJsonEntries) {
    const text = pkgBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const name = parsePackageName(text);
    if (name) nameByPath.set(entry.path, name);
  }
  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );
  const targetRoot = roots.find((r) => r.packageName === packageName);
  if (!targetRoot) {
    return { result: { exports: [], testCases: [] } };
  }

  const underPackage = (path: string) => {
    const d = targetRoot.directory;
    if (!d) return true;
    return path === d || path.startsWith(d + "/");
  };

  const sourceEntries = tree.filter(
    (e) => isSourcePath(e.path) && underPackage(e.path),
  );
  const factsResult = await ensureBlobFacts(
    dbKey,
    repoRoot,
    sourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  const exportsOut: AnalyzedExport[] = [];
  const testCasesOut: AnalyzedTestCase[] = [];

  for (const entry of sourceEntries) {
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const fileName = entry.path.split("/").pop() ?? entry.path;
    const isTest = isTestSourcePath(entry.path, fileName);
    if (isTest) {
      for (const tc of blobFactTestCases(fact)) {
        testCasesOut.push({
          packageName,
          filePath: entry.path,
          fullName: tc.fullName,
          subjectName: null,
          subjectSignature: null,
          subjectDocstring: null,
          subjectFilePath: null,
          subjectConfidence: null,
        });
      }
    } else {
      for (const exp of blobFactExports(fact)) {
        exportsOut.push({
          packageName,
          filePath: entry.path,
          name: exp.name,
          kind: exp.kind,
          signature: exp.signature ?? null,
          docstring: exp.docstring ?? null,
        });
      }
    }
  }

  exportsOut.sort((a, b) =>
    `${a.filePath}\0${a.name}\0${a.kind}`.localeCompare(
      `${b.filePath}\0${b.name}\0${b.kind}`,
    ),
  );
  const linkedTests = linkTestSubjects(testCasesOut, exportsOut);
  linkedTests.sort((a, b) =>
    `${a.filePath}\0${a.fullName}`.localeCompare(`${b.filePath}\0${b.fullName}`),
  );

  return { result: { exports: exportsOut, testCases: linkedTests } };
}
