import {
  isAncestor,
  listRefs,
  listTree,
  readBlobs,
  type GitCommit,
} from "@saflib/git";
import type { DbKey } from "@saflib/drizzle";
import type { AnalyzedCommitRef, BlobFactEntity, InsertBlobFactParams, InsertPackageMetricsParams } from "@saflib/dev-site-db/types";
import {
  blobFactExports,
  blobFactImports,
  blobFactTestCases,
} from "@saflib/dev-site-db/types";

import {
  ANALYZER_VERSION,
  buildFileSpecialty,
  countSourceLines,
  type FileSpecialty,
} from "@saflib/imports";
import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { makeSubsystemReporters } from "@saflib/node";
import {
  isScaffoldTemplatePath,
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
  sdkRequestFromSpecifier,
} from "./classify.ts";
import { linkTestSubjects } from "./link-test-subjects.ts";

import { getByHashes } from "@saflib/dev-site-db/queries/blob-facts/get-by-hashes";
import { upsertMany } from "@saflib/dev-site-db/queries/blob-facts/upsert-many";
export { ANALYZER_VERSION };

export interface AnalyzeCommitOptions {
  repo_root: string;
  /** Limit analysis to paths under this prefix (e.g. `products`). Empty = whole repo. */
  product_root?: string;
  /** Main branch ref for is_main_ancestor. Defaults to `main`. */
  mainRef?: string;
}

export interface AnalyzedExport {
  package_name: string;
  file_path: string;
  name: string;
  kind: InsertBlobFactParams["specialty"]["exports"][number]["kind"];
  signature: string | null;
  docstring: string | null;
}

export interface AnalyzedTestCase {
  package_name: string;
  file_path: string;
  full_name: string;
  subject_name: string | null;
  subject_signature: string | null;
  subject_docstring: string | null;
  subject_file_path: string | null;
  subject_confidence: "adjacent" | "package" | null;
}

export interface AnalyzedSnapshot {
  parent_hashes: string[];
  authored_at: Date;
  message: string;
  refs: AnalyzedCommitRef[];
  analyzer_version: string;
  package_metrics: Omit<InsertPackageMetricsParams, "commit_hash">[];
  exports: AnalyzedExport[];
  test_cases: AnalyzedTestCase[];
  export_count: number;
  test_case_count: number;
}

export type AnalyzeCommitError = GitCommandError;

function underProductRoot(path: string, product_root: string): boolean {
  if (!product_root) return true;
  return path === product_root || path.startsWith(product_root + "/");
}

function stripProductRoot(path: string, product_root: string): string {
  if (!product_root) return path;
  if (path === product_root) return "";
  if (path.startsWith(product_root + "/")) {
    return path.slice(product_root.length + 1);
  }
  return path;
}

/** Parse exports/imports(/tests/tables) from source text — no git or DB. */
export function parseSourceSpecialty(source: string): FileSpecialty {
  return buildFileSpecialty(source);
}

function parseBlobFact(
  blob_hash: string,
  source: string,
): InsertBlobFactParams {
  return {
    blob_hash,
    analyzer_version: ANALYZER_VERSION,
    line_count: countSourceLines(source),
    specialty: buildFileSpecialty(source),
    computed_at: new Date(),
  };
}

/**
 * Ensure blob_facts rows exist for the given hashes (current analyzer version).
 * Returns a map of blob_hash → fact.
 */
export async function ensureBlobFacts(
  dbKey: DbKey,
  repo_root: string,
  blobHashes: string[],
): Promise<ReturnsError<Map<string, BlobFactEntity>, GitCommandError>> {
  const unique = [...new Set(blobHashes)];
  const existing = (await getByHashes(dbKey, unique)).result!;
  const byHash = new Map<string, BlobFactEntity>();
  for (const row of existing) {
    if (row.analyzer_version === ANALYZER_VERSION) {
      byHash.set(row.blob_hash, row);
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

  const blobs = readBlobs(repo_root, missing);
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
      byHash.set(row.blob_hash, row);
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
  const repo_root = options.repo_root;
  const product_root = (options.product_root ?? "").replace(/^\/+|\/+$/g, "");
  const mainRef = options.mainRef ?? "main";

  const treeResult = listTree(repo_root, commit.hash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) =>
    underProductRoot(e.path, product_root),
  );

  const refsResult = listRefs(repo_root);
  if (refsResult.error) return { error: refsResult.error };
  const ancestorResult = isAncestor(repo_root, commit.hash, mainRef);
  const is_main_ancestor =
    ancestorResult.error ? false : (ancestorResult.result ?? false);

  const refs: AnalyzedCommitRef[] = refsResult.result
    .filter((r) => r.hash === commit.hash)
    .map((r) => ({
      name: r.name,
      type: r.type,
      is_main_ancestor,
    }));

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const pkgBlobHashes = packageJsonEntries.map((e) => e.blobHash);
  const pkgBlobs = readBlobs(repo_root, pkgBlobHashes);
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
    repo_root,
    sourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  type Agg = {
    package_name: string;
    directory: string;
    source_files: number;
    source_lines: number;
    prod_lines: number;
    test_lines: number;
    test_files: number;
  };
  const byPackage = new Map<string, Agg>();
  const exportsOut: AnalyzedExport[] = [];
  const testCasesOut: AnalyzedTestCase[] = [];

  for (const entry of sourceEntries) {
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;

    const file_name = entry.path.split("/").pop() ?? entry.path;
    const isTest = isTestSourcePath(entry.path, file_name);
    const pkg = packageForPath(entry.path, roots);
    const key = pkg.directory || "(root)";
    const agg = byPackage.get(key) ?? {
      package_name: pkg.package_name,
      directory: stripProductRoot(pkg.directory, product_root) || pkg.directory,
      source_files: 0,
      source_lines: 0,
      prod_lines: 0,
      test_lines: 0,
      test_files: 0,
    };

    agg.source_files += 1;
    agg.source_lines += fact.line_count;
    if (isTest) {
      agg.test_files += 1;
      agg.test_lines += fact.line_count;
      for (const tc of blobFactTestCases(fact)) {
        testCasesOut.push({
          package_name: pkg.package_name,
          file_path: entry.path,
          full_name: tc.fullName,
          subject_name: null,
          subject_signature: null,
          subject_docstring: null,
          subject_file_path: null,
          subject_confidence: null,
        });
      }
    } else {
      agg.prod_lines += fact.line_count;
      if (!isScaffoldTemplatePath(entry.path)) {
        for (const exp of blobFactExports(fact)) {
          exportsOut.push({
            package_name: pkg.package_name,
            file_path: entry.path,
            name: exp.name,
            kind: exp.kind,
            signature: exp.signature ?? null,
            docstring: exp.docstring ?? null,
          });
        }
      }
    }
    byPackage.set(key, agg);
  }

  exportsOut.sort((a, b) =>
    `${a.package_name}\0${a.file_path}\0${a.name}\0${a.kind}`.localeCompare(
      `${b.package_name}\0${b.file_path}\0${b.name}\0${b.kind}`,
    ),
  );

  const linkedTests = linkTestSubjects(testCasesOut, exportsOut);
  linkedTests.sort((a, b) =>
    `${a.package_name}\0${a.file_path}\0${a.full_name}`.localeCompare(
      `${b.package_name}\0${b.file_path}\0${b.full_name}`,
    ),
  );

  return {
    result: {
      parent_hashes: commit.parentHashes,
      authored_at: new Date(commit.authoredAt),
      message: commit.subject,
      refs,
      analyzer_version: ANALYZER_VERSION,
      package_metrics: [...byPackage.values()],
      exports: exportsOut,
      test_cases: linkedTests,
      export_count: exportsOut.length,
      test_case_count: linkedTests.length,
    },
  };
}

/**
 * Reassemble exports/tests for an already-analyzed commit from live ls-tree + blob_facts.
 * Self-heals missing blob_facts by parsing on demand.
 */
export async function assembleCommitSymbols(
  dbKey: DbKey,
  commit_hash: string,
  options: AnalyzeCommitOptions,
): Promise<
  ReturnsError<
    { exports: AnalyzedExport[]; test_cases: AnalyzedTestCase[] },
    AnalyzeCommitError
  >
> {
  const synthetic: GitCommit = {
    hash: commit_hash,
    parentHashes: [],
    authoredAt: new Date(0).toISOString(),
    subject: "",
  };
  const snap = await analyzeCommit(dbKey, synthetic, options);
  if (snap.error) return { error: snap.error };
  return {
    result: {
      exports: snap.result.exports,
      test_cases: snap.result.test_cases,
    },
  };
}

export interface PackageSdkRequestImport {
  /** Repo-relative importer path. */
  file_path: string;
  sdkPackageName: string;
  requestStem: string;
}

/**
 * Like {@link assembleCommitSymbols} but only for one package — much cheaper
 * for the checkout package panel (skips blob-fact work for other packages).
 */
export async function assemblePackageSymbols(
  dbKey: DbKey,
  commit_hash: string,
  package_name: string,
  options: AnalyzeCommitOptions,
): Promise<
  ReturnsError<
    {
      exports: AnalyzedExport[];
      test_cases: AnalyzedTestCase[];
      hasVue: boolean;
      sdkRequestImports: PackageSdkRequestImport[];
    },
    AnalyzeCommitError
  >
> {
  const repo_root = options.repo_root;
  const product_root = (options.product_root ?? "").replace(/^\/+|\/+$/g, "");

  const treeResult = listTree(repo_root, commit_hash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) =>
    underProductRoot(e.path, product_root),
  );

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const pkgBlobHashes = packageJsonEntries.map((e) => e.blobHash);
  const pkgBlobs = readBlobs(repo_root, pkgBlobHashes);
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
  const targetRoot = roots.find((r) => r.package_name === package_name);
  if (!targetRoot) {
    return {
      result: { exports: [], test_cases: [], hasVue: false, sdkRequestImports: [] },
    };
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
    repo_root,
    sourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  const exportsOut: AnalyzedExport[] = [];
  const testCasesOut: AnalyzedTestCase[] = [];
  const sdkRequestImports: PackageSdkRequestImport[] = [];
  let hasVue = false;

  for (const entry of sourceEntries) {
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    if (entry.path.endsWith(".vue")) hasVue = true;
    const file_name = entry.path.split("/").pop() ?? entry.path;
    const isTest = isTestSourcePath(entry.path, file_name);
    if (isTest) {
      for (const tc of blobFactTestCases(fact)) {
        testCasesOut.push({
          package_name,
          file_path: entry.path,
          full_name: tc.fullName,
          subject_name: null,
          subject_signature: null,
          subject_docstring: null,
          subject_file_path: null,
          subject_confidence: null,
        });
      }
    } else if (!isScaffoldTemplatePath(entry.path)) {
      for (const exp of blobFactExports(fact)) {
        exportsOut.push({
          package_name,
          file_path: entry.path,
          name: exp.name,
          kind: exp.kind,
          signature: exp.signature ?? null,
          docstring: exp.docstring ?? null,
        });
      }
      for (const imp of blobFactImports(fact)) {
        const parsed = sdkRequestFromSpecifier(imp.specifier);
        if (!parsed) continue;
        sdkRequestImports.push({
          file_path: entry.path,
          sdkPackageName: parsed.sdkPackageName,
          requestStem: parsed.requestStem,
        });
      }
    }
  }

  exportsOut.sort((a, b) =>
    `${a.file_path}\0${a.name}\0${a.kind}`.localeCompare(
      `${b.file_path}\0${b.name}\0${b.kind}`,
    ),
  );
  const linkedTests = linkTestSubjects(testCasesOut, exportsOut);
  linkedTests.sort((a, b) =>
    `${a.file_path}\0${a.full_name}`.localeCompare(`${b.file_path}\0${b.full_name}`),
  );

  return {
    result: {
      exports: exportsOut,
      test_cases: linkedTests,
      hasVue,
      sdkRequestImports,
    },
  };
}
