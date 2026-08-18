import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Best common ancestor of two commits/refs (`git merge-base <a> <b>`).
 */
export function mergeBase(
  repoRoot: string,
  a: string,
  b: string,
): ReturnsError<string, GitCommandError> {
  const { result, error } = execGit(repoRoot, ["merge-base", a, b]);
  if (error) return { error };
  return { result: result.trim() };
}
