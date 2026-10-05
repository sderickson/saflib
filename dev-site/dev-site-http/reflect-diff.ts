import type { DbKey } from "@saflib/drizzle";
import { resolveRef } from "@saflib/git";
import { getByIdWorkflowRun, WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import type { ReturnsError } from "@saflib/utils";
import type { GitCommandError } from "@saflib/git";
import type { AnalyzeCommitOptions } from "./analyze-commit.ts";
import { diffHashesEphemeral } from "./ephemeral-diff.ts";
import type { CommitDiff } from "./diff-commits.ts";

export class MissingBaseCommitHashError extends Error {
  constructor() {
    super("This run has no base_commit_hash — its cwd wasn't inside a git repo when it started.");
  }
}

export type ReflectDiffError = GitCommandError | WorkflowRunNotFoundError | MissingBaseCommitHashError;
export type ReflectDiffResult = ReturnsError<
  { commit_diff: CommitDiff; is_final: boolean },
  ReflectDiffError
>;

/**
 * A `CommitDiff` of what a run actually changed: `base_commit_hash` (HEAD
 * when it started) to `completion_hash` (HEAD the moment it finished) —
 * both real, fixed commits, so unlike a live-`HEAD` comparison this stays
 * correct regardless of what unrelated work lands in the repo afterward.
 *
 * For a run that hasn't reached `done` yet (`completion_hash` still
 * null), falls back to the repo's live `HEAD` instead — `is_final: false`
 * on the result marks that as a still-moving, `so far` view rather than
 * the run's settled reflection.
 */
export async function reflectRunDiff(
  workflowsDbKey: DbKey,
  devSiteDbKey: DbKey,
  runId: string,
  repo: AnalyzeCommitOptions,
): Promise<ReflectDiffResult> {
  const { result: run, error: getError } = await getByIdWorkflowRun(workflowsDbKey, { id: runId });
  if (getError) return { error: getError };

  if (!run.base_commit_hash) return { error: new MissingBaseCommitHashError() };

  let toHash = run.completion_hash;
  const is_final = toHash !== null;
  if (!toHash) {
    const { result: liveHead, error: refError } = resolveRef(repo.repo_root, "HEAD");
    if (refError) return { error: refError };
    toHash = liveHead!;
  }

  const commit_diff = await diffHashesEphemeral(devSiteDbKey, run.base_commit_hash, toHash, repo);
  return { result: { commit_diff, is_final } };
}
