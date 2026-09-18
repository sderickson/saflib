import type { DbKey } from "@saflib/drizzle";
import type { GitCommit } from "@saflib/git";
import { resolveRef } from "@saflib/git";
import { getByIdWorkflowRun, WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import {
  previewRun,
  loadWorkflowDefinition,
  type PreviewStepEntry,
  type WorkflowDefinition,
} from "@saflib/new-workflows";
import type { ReturnsError } from "@saflib/utils";
import type { GitCommandError } from "@saflib/git";
import { analyzeCommit, type AnalyzeCommitOptions, type AnalyzedSnapshot } from "./analyze-commit.ts";
import {
  packageKey,
  metricsEqual,
  exportKey,
  testCaseKey,
  toApiTestCase,
  diffLists,
  toPackageMetrics,
  type CommitDiff,
} from "./diff-commits.ts";

export type PreviewDiffError = GitCommandError | WorkflowRunNotFoundError;
export type PreviewDiffResult = ReturnsError<
  { commit_diff: CommitDiff; entries: PreviewStepEntry[] },
  PreviewDiffError
>;

/** No `authored_at`/parents of its own — plumbing (`listTree`/`readBlobs`) never reads these fields. */
function syntheticCommit(hash: string): GitCommit {
  return { hash, parentHashes: [], authoredAt: new Date(0).toISOString(), subject: "" };
}

async function snapshotFor(
  dbKey: DbKey,
  hash: string,
  options: AnalyzeCommitOptions,
): Promise<AnalyzedSnapshot> {
  const { result, error } = await analyzeCommit(dbKey, syntheticCommit(hash), options);
  if (error) throw error;
  return result;
}

/**
 * A `CommitDiff` between the repo's current commit and what a workflow run
 * would produce, without ever persisting the hypothetical side (or the
 * real side, for symmetry) to `analyzed_commits`/`package_metrics` — both
 * are computed fresh via `analyzeCommit`, same as `diffCommits` does for
 * package/export/test data, just skipping its DB-cached path entirely.
 * `db_schemas` is left empty for now — see `saflib/plans/
 * workflow-preview.md`'s "explicitly out of scope" for why.
 */
export async function previewRunDiff(
  /** Owns the `workflow_run` row being previewed (`new-workflows-db`'s connection). */
  workflowsDbKey: DbKey,
  /** Owns `blob_facts` (dev-site-db's connection) — `analyzeCommit`'s cache table. */
  devSiteDbKey: DbKey,
  runId: string,
  registry: WorkflowDefinition<any, any>[],
  repo: AnalyzeCommitOptions,
): Promise<PreviewDiffResult> {
  const { result: run, error: getError } = await getByIdWorkflowRun(workflowsDbKey, { id: runId });
  if (getError) return { error: getError };

  const { result: baseHash, error: refError } = resolveRef(repo.repo_root, "HEAD");
  if (refError) return { error: refError };

  const definition = await loadWorkflowDefinition(run.workflow_ref, registry, { cwd: run.cwd });
  const preview = await previewRun(workflowsDbKey, definition, run.input, {
    repoRoot: repo.repo_root,
    baseHash: baseHash!,
    cwd: run.cwd,
  });

  const [fromSnapshot, toSnapshot] = await Promise.all([
    snapshotFor(devSiteDbKey, preview.baseHash, repo),
    snapshotFor(devSiteDbKey, preview.finalHash, repo),
  ]);

  const fromMetrics = fromSnapshot.package_metrics.map((m) => toPackageMetrics(m));
  const toMetrics = toSnapshot.package_metrics.map((m) => toPackageMetrics(m));
  const beforePkgs = new Map(fromMetrics.map((m) => [packageKey(m), m]));
  const afterPkgs = new Map(toMetrics.map((m) => [packageKey(m), m]));

  const added = [];
  const removed = [];
  const changed = [];
  for (const [k, after] of afterPkgs) {
    const before = beforePkgs.get(k);
    if (!before) added.push(after);
    else if (!metricsEqual(before, after)) changed.push({ before, after });
  }
  for (const [k, before] of beforePkgs) {
    if (!afterPkgs.has(k)) removed.push(before);
  }

  const exportDiff = diffLists(fromSnapshot.exports, toSnapshot.exports, exportKey);
  const testDiff = diffLists(fromSnapshot.test_cases, toSnapshot.test_cases, testCaseKey);

  const commit_diff: CommitDiff = {
    from_hash: preview.baseHash,
    to_hash: preview.finalHash,
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
      tables: { added: [], removed: [] },
      columns: { added: [], removed: [], changed: [] },
    },
  };

  return { result: { commit_diff, entries: preview.entries } };
}
