import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * True when `maybeAncestor` is an ancestor of `maybeDescendant` (or they are
 * the same commit). Wraps `git merge-base --is-ancestor`.
 */
export function isAncestor(
  repoRoot: string,
  maybeAncestor: string,
  maybeDescendant: string,
): ReturnsError<boolean, GitCommandError> {
  const args = [
    "merge-base",
    "--is-ancestor",
    maybeAncestor,
    maybeDescendant,
  ];
  const { error } = execGit(repoRoot, args);
  if (!error) return { result: true };
  // git exits 1 when not an ancestor; other failures are real errors.
  if (error.exitCode === 1) return { result: false };
  return { error };
}
