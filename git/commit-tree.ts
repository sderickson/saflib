import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Builds a commit object from an existing tree, without touching the
 * working tree, the index, or any ref — the caller decides whether (and
 * how) the result is ever referenced.
 */
export function commitTree(
  repoRoot: string,
  treeHash: string,
  parentHash: string,
  message: string,
): ReturnsError<string, GitCommandError> {
  const { result, error } = execGit(repoRoot, [
    "commit-tree",
    treeHash,
    "-p",
    parentHash,
    "-m",
    message,
  ]);
  if (error) return { error };
  return { result: result.trim() };
}
