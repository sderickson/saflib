import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Files under `paths` (repo-relative) that exist in the index or are
 * untracked but not ignored — i.e. what `HEAD`'s tree misses for a dirty
 * working tree (new files, including ones inside brand-new directories).
 * Ignored content (e.g. `node_modules/`) is skipped.
 */
export function listWorkingTreeFiles(
  repoRoot: string,
  paths: readonly string[],
): ReturnsError<string[], GitCommandError> {
  const args = ["ls-files", "-z", "--cached", "--others", "--exclude-standard"];
  if (paths.length > 0)
    args.push("--", ...paths.map((p) => (p === "" ? "." : p)));
  const { result, error } = execGit(repoRoot, args, {
    env: { GIT_LITERAL_PATHSPECS: "1" },
  });
  if (error) return { error };
  return { result: result.split("\0").filter(Boolean) };
}
