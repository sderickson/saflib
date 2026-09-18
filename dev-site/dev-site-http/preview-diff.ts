import type { DbKey } from "@saflib/drizzle";
import { resolveRef } from "@saflib/git";
import { getByIdWorkflowRun, WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import type { WorkflowRunEntity } from "@saflib/new-workflows-db";
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

async function previewOneRun(
  workflowsDbKey: DbKey,
  run: WorkflowRunEntity,
  registry: WorkflowDefinition<any, any>[],
  repoRoot: string,
  baseHash: string,
) {
  const definition = await loadWorkflowDefinition(run.workflow_ref, registry, { cwd: run.cwd });
  return previewRun(workflowsDbKey, definition, run.input, {
    repoRoot,
    baseHash,
    cwd: run.cwd,
  });
}

/**
 * A `CommitDiff` between the repo's current commit (or, chained through
 * `baseRunIds`, another run's own hypothetical result) and what a workflow
 * run would produce.
 *
 * `baseRunIds`, when given, previews each of those runs *first*, in order,
 * threading each one's resulting hash into the next as its starting point
 * — e.g. previewing phase 3 with `baseRunIds: [phase1RunId, phase2RunId]`
 * shows what phase 3 would do *on top of* phases 1 and 2's own hypothetical
 * results, not against the repo's real (possibly not-yet-caught-up)
 * current state. Without it, defaults to the repo's live `HEAD`, same as
 * before chaining existed.
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

  const { result: liveHead, error: refError } = resolveRef(repo.repo_root, "HEAD");
  if (refError) return { error: refError };

  let baseHash = liveHead!;
  for (const baseRunId of options?.baseRunIds ?? []) {
    const { result: baseRun, error: baseRunError } = await getByIdWorkflowRun(workflowsDbKey, {
      id: baseRunId,
    });
    if (baseRunError) return { error: baseRunError };
    const basePreview = await previewOneRun(
      workflowsDbKey,
      baseRun,
      registry,
      repo.repo_root,
      baseHash,
    );
    baseHash = basePreview.finalHash;
  }

  const preview = await previewOneRun(workflowsDbKey, run, registry, repo.repo_root, baseHash);
  const commit_diff = await diffHashesEphemeral(
    devSiteDbKey,
    preview.baseHash,
    preview.finalHash,
    repo,
  );

  return { result: { commit_diff, entries: preview.entries } };
}
