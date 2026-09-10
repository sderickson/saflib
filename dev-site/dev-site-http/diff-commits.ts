import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";

import type { components } from "@saflib/dev-site-spec/operations/diffCommits";
import {
  assembleCommitSymbols,
  type AnalyzedExport,
  type AnalyzedTestCase,
} from "./analyze-commit.ts";
import {
  assemblePackageDbInventory,
  flattenInventoryTables,
} from "./assemble-package-db-inventory.ts";
import type { RepoReadOptions } from "./get-commit.ts";
import {
  loadPackageManifests,
  manifestByPackageName,
} from "./package-manifests.ts";

import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { listByCommit } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";
import { listByCommit as listIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/list-by-commit";
import {
  debtCountFromIssueCounts,
  emptyIssueCountsByKind,
  type IssueCountsByKind,
  type PackageIssueKind,
} from "./package-issues.ts";
export type CommitDiff = components["schemas"]["commit-diff"];
export type PackageMetrics = components["schemas"]["package-metrics"];
export type ExportEntry = components["schemas"]["export-entry"];
export type TestCase = components["schemas"]["test-case"];
export type DbSchemaTable = components["schemas"]["db-schema-table"];
export type DbSchemaColumn = components["schemas"]["db-schema-column"];

export type DiffCommitsResult = ReturnsError<
  CommitDiff,
  AnalyzedCommitNotFoundError
>;

function packageKey(m: PackageMetrics): string {
  return m.package_name;
}

function metricsEqual(a: PackageMetrics, b: PackageMetrics): boolean {
  return (
    a.source_files === b.source_files &&
    a.source_lines === b.source_lines &&
    a.prod_lines === b.prod_lines &&
    a.test_lines === b.test_lines &&
    a.test_files === b.test_files &&
    a.directory === b.directory &&
    a.debt_count === b.debt_count
  );
}

function exportKey(e: AnalyzedExport | ExportEntry): string {
  return `${e.package_name}\0${e.file_path}\0${e.name}\0${e.kind}`;
}

function testCaseKey(t: AnalyzedTestCase | TestCase): string {
  return `${t.package_name}\0${t.file_path}\0${t.full_name}`;
}

function toApiTestCase(t: AnalyzedTestCase): TestCase {
  if (!t.subject_name || !t.subject_confidence || !t.subject_file_path) {
    return {
      package_name: t.package_name,
      file_path: t.file_path,
      full_name: t.full_name,
    };
  }
  return {
    package_name: t.package_name,
    file_path: t.file_path,
    full_name: t.full_name,
    subject_name: t.subject_name,
    subject_signature: t.subject_signature,
    subject_docstring: t.subject_docstring,
    subject_file_path: t.subject_file_path,
    subject_confidence: t.subject_confidence,
  };
}

function diffLists<T>(
  before: T[],
  after: T[],
  keyOf: (item: T) => string,
): { added: T[]; removed: T[] } {
  const beforeMap = new Map(before.map((i) => [keyOf(i), i]));
  const afterMap = new Map(after.map((i) => [keyOf(i), i]));
  const added: T[] = [];
  const removed: T[] = [];
  for (const [k, v] of afterMap) {
    if (!beforeMap.has(k)) added.push(v);
  }
  for (const [k, v] of beforeMap) {
    if (!afterMap.has(k)) removed.push(v);
  }
  return { added, removed };
}

function issueCountsByPackage(
  rows: Array<{ package_name: string; kind: string; count: number }>,
): Map<string, IssueCountsByKind> {
  const byPackage = new Map<string, IssueCountsByKind>();
  for (const row of rows) {
    const kind = row.kind as PackageIssueKind;
    const pkg = byPackage.get(row.package_name) ?? emptyIssueCountsByKind();
    if (kind in pkg) pkg[kind] += row.count;
    byPackage.set(row.package_name, pkg);
  }
  return byPackage;
}

function toPackageMetrics(
  m: {
    package_name: string;
    directory: string;
    source_files: number;
    source_lines: number;
    prod_lines: number;
    test_lines: number;
    test_files: number;
  },
  issue_counts_by_kind: IssueCountsByKind = emptyIssueCountsByKind(),
): PackageMetrics {
  return {
    package_name: m.package_name,
    directory: m.directory,
    source_files: m.source_files,
    source_lines: m.source_lines,
    prod_lines: m.prod_lines,
    test_lines: m.test_lines,
    test_files: m.test_files,
    issue_counts_by_kind,
    debt_count: debtCountFromIssueCounts(issue_counts_by_kind),
  };
}

/**
 * Diff two analyzed commits. `from_hash` is the baseline ("before");
 * `to_hash` is the comparison ("after").
 */
export async function diffCommits(
  dbKey: DbKey,
  from_hash: string,
  to_hash: string,
  repo: RepoReadOptions,
): Promise<DiffCommitsResult> {
  const [fromCommit, toCommit] = await Promise.all([
    getByHash(dbKey, from_hash),
    getByHash(dbKey, to_hash),
  ]);
  if (fromCommit.error) return { error: fromCommit.error };
  if (toCommit.error) return { error: toCommit.error };

  const [fromMetricsRes, toMetricsRes, fromSymbols, toSymbols, fromIssues, toIssues] =
    await Promise.all([
      listByCommit(dbKey, from_hash),
      listByCommit(dbKey, to_hash),
      assembleCommitSymbols(dbKey, from_hash, repo),
      assembleCommitSymbols(dbKey, to_hash, repo),
      listIssueStats(dbKey, from_hash),
      listIssueStats(dbKey, to_hash),
    ]);

  const fromIssueMap = issueCountsByPackage(fromIssues.result ?? []);
  const toIssueMap = issueCountsByPackage(toIssues.result ?? []);
  const fromMetrics = fromMetricsRes.result!.map((m) =>
    toPackageMetrics(m, fromIssueMap.get(m.package_name)),
  );
  const toMetrics = toMetricsRes.result!.map((m) =>
    toPackageMetrics(m, toIssueMap.get(m.package_name)),
  );

  const beforePkgs = new Map(fromMetrics.map((m) => [packageKey(m), m]));
  const afterPkgs = new Map(toMetrics.map((m) => [packageKey(m), m]));

  const added: PackageMetrics[] = [];
  const removed: PackageMetrics[] = [];
  const changed: Array<{ before: PackageMetrics; after: PackageMetrics }> = [];

  for (const [k, after] of afterPkgs) {
    const before = beforePkgs.get(k);
    if (!before) {
      added.push(after);
    } else if (!metricsEqual(before, after)) {
      changed.push({ before, after });
    }
  }
  for (const [k, before] of beforePkgs) {
    if (!afterPkgs.has(k)) removed.push(before);
  }

  const fromExports = fromSymbols.result?.exports ?? [];
  const toExports = toSymbols.result?.exports ?? [];
  const fromTests = fromSymbols.result?.test_cases ?? [];
  const toTests = toSymbols.result?.test_cases ?? [];

  const exportDiff = diffLists(fromExports, toExports, exportKey);
  const testDiff = diffLists(fromTests, toTests, testCaseKey);

  const dbPkgNames = new Set<string>();
  const [fromManifests, toManifests] = [
    loadPackageManifests(repo.repo_root, from_hash),
    loadPackageManifests(repo.repo_root, to_hash),
  ];
  const fromByName = manifestByPackageName(fromManifests.result ?? []);
  const toByName = manifestByPackageName(toManifests.result ?? []);
  for (const m of fromMetrics) {
    if (fromByName.get(m.package_name)?.kind === "db") {
      dbPkgNames.add(m.package_name);
    }
  }
  for (const m of toMetrics) {
    if (toByName.get(m.package_name)?.kind === "db") {
      dbPkgNames.add(m.package_name);
    }
  }

  const fromTables: DbSchemaTable[] = [];
  const toTables: DbSchemaTable[] = [];
  const fromCols: DbSchemaColumn[] = [];
  const toCols: DbSchemaColumn[] = [];

  for (const package_name of dbPkgNames) {
    const [fromInv, toInv] = await Promise.all([
      assemblePackageDbInventory(dbKey, from_hash, package_name, repo),
      assemblePackageDbInventory(dbKey, to_hash, package_name, repo),
    ]);
    const fromFlat = flattenInventoryTables(
      package_name,
      fromInv.result ?? { entities: [] },
    );
    const toFlat = flattenInventoryTables(
      package_name,
      toInv.result ?? { entities: [] },
    );
    for (const t of fromFlat) {
      fromTables.push({
        package_name: t.package_name,
        table_name: t.table_name,
        export_name: t.export_name,
        file_path: t.file_path,
        docstring: t.docstring,
      });
      for (const c of t.columns) {
        fromCols.push({
          package_name: t.package_name,
          table_name: t.table_name,
          sql_name: c.sql_name,
          type_kind: c.type_kind,
          prop_name: c.prop_name,
          docstring: c.docstring,
        });
      }
    }
    for (const t of toFlat) {
      toTables.push({
        package_name: t.package_name,
        table_name: t.table_name,
        export_name: t.export_name,
        file_path: t.file_path,
        docstring: t.docstring,
      });
      for (const c of t.columns) {
        toCols.push({
          package_name: t.package_name,
          table_name: t.table_name,
          sql_name: c.sql_name,
          type_kind: c.type_kind,
          prop_name: c.prop_name,
          docstring: c.docstring,
        });
      }
    }
  }

  const tableKey = (t: DbSchemaTable) =>
    `${t.package_name}\0${t.table_name}`;
  const colKey = (c: DbSchemaColumn) =>
    `${c.package_name}\0${c.table_name}\0${c.sql_name}`;

  const tableDiff = diffLists(fromTables, toTables, tableKey);
  const beforeCols = new Map(fromCols.map((c) => [colKey(c), c]));
  const afterCols = new Map(toCols.map((c) => [colKey(c), c]));
  const colsAdded: DbSchemaColumn[] = [];
  const colsRemoved: DbSchemaColumn[] = [];
  const colsChanged: Array<{ before: DbSchemaColumn; after: DbSchemaColumn }> =
    [];
  for (const [k, after] of afterCols) {
    const before = beforeCols.get(k);
    if (!before) {
      colsAdded.push(after);
    } else if (
      before.type_kind !== after.type_kind ||
      before.prop_name !== after.prop_name ||
      before.docstring !== after.docstring
    ) {
      colsChanged.push({ before, after });
    }
  }
  for (const [k, before] of beforeCols) {
    if (!afterCols.has(k)) colsRemoved.push(before);
  }

  const commit_diff: CommitDiff = {
    from_hash,
    to_hash,
    package_metrics: { added, removed, changed },
    exports: {
      added: exportDiff.added.map((e) => ({
        package_name: e.package_name,
        file_path: e.file_path,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
      })),
      removed: exportDiff.removed.map((e) => ({
        package_name: e.package_name,
        file_path: e.file_path,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
      })),
    },
    test_cases: {
      added: testDiff.added.map(toApiTestCase),
      removed: testDiff.removed.map(toApiTestCase),
    },
    db_schemas: {
      tables: {
        added: tableDiff.added,
        removed: tableDiff.removed,
      },
      columns: {
        added: colsAdded,
        removed: colsRemoved,
        changed: colsChanged,
      },
    },
  };
  return { result: commit_diff };
}
