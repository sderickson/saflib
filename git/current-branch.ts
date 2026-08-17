import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Short name of the branch HEAD points at (e.g. `main`), or `null` when detached.
 */
export function currentBranch(
  repoRoot: string,
): ReturnsError<string | null, GitCommandError> {
  const { result, error } = execGit(repoRoot, [
    "symbolic-ref",
    "--short",
    "-q",
    "HEAD",
  ]);
  if (error) {
    // Detached HEAD exits non-zero with -q; treat as null rather than hard fail.
    if (error.exitCode === 1) return { result: null };
    return { error };
  }
  const name = result.trim();
  return { result: name || null };
}
