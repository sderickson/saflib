import type { DbKey } from "@saflib/drizzle";
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
import type { AnalyzeCommitOptions } from "./analyze-commit.ts";
import { diffHashesEphemeral } from "./ephemeral-diff.ts";
import type { CommitDiff } from "./diff-commits.ts";

export type PreviewDiffError = GitCommandError | WorkflowRunNotFoundError;
export type PreviewDiffResult = ReturnsError<
  { commit_diff: CommitDiff; entries: PreviewStepEntry[] },
  PreviewDiffError
>;

/** What any preview walk needs, regardless of whether it came from a persisted run row. */
interface PreviewSource {
  workflowRef: string;
  input: Record<string, unknown>;
  cwd: string;
}

async function previewOneSource(
  workflowsDbKey: DbKey,
  source: PreviewSource,
  registry: WorkflowDefinition<any, any>[],
  repoRoot: string,
  baseHash: string,
) {
  const definition = await loadWorkflowDefinition(source.workflowRef, registry, { cwd: source.cwd });
  return previewRun(workflowsDbKey, definition, source.input, {
    repoRoot,
    baseHash,
    cwd: source.cwd,
  });
}

/** Resolves `baseHash` forward through a chain of *other* runs' own previews — shared by both entry points below. */
async function resolveChainedBaseHash(
  workflowsDbKey: DbKey,
  baseRunIds: string[],
  registry: WorkflowDefinition<any, any>[],
  repoRoot: string,
  liveHead: string,
): Promise<ReturnsError<string, WorkflowRunNotFoundError>> {
  let baseHash = liveHead;
  for (const baseRunId of baseRunIds) {
    const { result: baseRun, error } = await getByIdWorkflowRun(workflowsDbKey, { id: baseRunId });
    if (error) return { error };
    const basePreview = await previewOneSource(
      workflowsDbKey,
      { workflowRef: baseRun.workflow_ref, input: baseRun.input, cwd: baseRun.cwd },
      registry,
      repoRoot,
      baseHash,
    );
    baseHash = basePreview.finalHash;
  }
  return { result: baseHash };
}

/**
 * A `CommitDiff` between the repo's current commit (or, chained through
 * `baseRunIds`, another run's own hypothetical result) and what an
 * *existing* workflow run would produce.
 *
 * `baseRunIds`, when given, previews each of those runs *first*, in order,
 * threading each one's resulting hash into the next as its starting point
 * — e.g. previewing phase 3 with `baseRunIds: [phase1RunId, phase2RunId]`
 * shows what phase 3 would do *on top of* phases 1 and 2's own hypothetical
 * results, not against the repo's real (possibly not-yet-caught-up)
 * current state. Without it, defaults to the repo's live `HEAD`.
 */
export async function previewRunDiff(
  /** Owns the `workflow_run` row being previewed (`new-workflows-db`'s connection). */
  workflowsDbKey: DbKey,
  /** Owns `blob_facts` (dev-site-db's connection) — `analyzeCommit`'s cache table. */
  devSiteDbKey: DbKey,
  runId: string,
  registry: WorkflowDefinition<any, any>[],
  repo: AnalyzeCommitOptions,
  options?: { baseRunIds?: string[] },
): Promise<PreviewDiffResult> {
  const { result: run, error: getError } = await getByIdWorkflowRun(workflowsDbKey, { id: runId });
  if (getError) return { error: getError };

  return previewSourceDiff(
    workflowsDbKey,
    devSiteDbKey,
    { workflowRef: run.workflow_ref, input: run.input, cwd: run.cwd },
    registry,
    repo,
    options,
  );
}

/**
 * Same as {@link previewRunDiff}, but for a workflow that's never been run
 * at all — no `workflow_run` row required. `id` is the same thing `POST
 * /api/workflows/{id}/runs` accepts (a registered workflow id, or a plan
 * file's path); `input`/`cwd` default the same way a real run's would
 * (empty input, the repo root).
 */
export async function previewWorkflowDiff(
  workflowsDbKey: DbKey,
  devSiteDbKey: DbKey,
  workflowRef: string,
  registry: WorkflowDefinition<any, any>[],
  repo: AnalyzeCommitOptions,
  options?: { input?: Record<string, unknown>; cwd?: string; baseRunIds?: string[] },
): Promise<PreviewDiffResult> {
  return previewSourceDiff(
    workflowsDbKey,
    devSiteDbKey,
    { workflowRef, input: options?.input ?? {}, cwd: options?.cwd ?? repo.repo_root },
    registry,
    repo,
    options,
  );
}

async function previewSourceDiff(
  workflowsDbKey: DbKey,
  devSiteDbKey: DbKey,
  source: PreviewSource,
  registry: WorkflowDefinition<any, any>[],
  repo: AnalyzeCommitOptions,
  options?: { baseRunIds?: string[] },
): Promise<PreviewDiffResult> {
  const { result: liveHead, error: refError } = resolveRef(repo.repo_root, "HEAD");
  if (refError) return { error: refError };

  const { result: baseHash, error: chainError } = await resolveChainedBaseHash(
    workflowsDbKey,
    options?.baseRunIds ?? [],
    registry,
    repo.repo_root,
    liveHead!,
  );
  if (chainError) return { error: chainError };

  const preview = await previewOneSource(workflowsDbKey, source, registry, repo.repo_root, baseHash!);
  const commit_diff = await diffHashesEphemeral(
    devSiteDbKey,
    preview.baseHash,
    preview.finalHash,
    repo,
  );

  return { result: { commit_diff, entries: preview.entries } };
}
