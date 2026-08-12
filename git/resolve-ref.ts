import type { ReturnsError } from "@saflib/monorepo";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Resolve a ref (default `HEAD`) to a full commit hash via `git rev-parse`.
 */
export function resolveRef(
  repoRoot: string,
  ref: string = "HEAD",
): ReturnsError<string, GitCommandError> {
  const { result, error } = execGit(repoRoot, ["rev-parse", ref]);
  if (error) return { error };
  return { result: result.trim() };
}
