import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Untracked files under `paths` (repo-relative) that git ignores. Wholly
 * ignored directories collapse to a single entry with a trailing `/`
 * (e.g. `pkg/node_modules/`), so this stays cheap on large trees.
 *
 * Useful for spotting content that tree hashes can't see but that some other
 * consumer (e.g. a Docker build context) still picks up.
 */
export function listIgnored(
  repoRoot: string,
  paths: readonly string[],
): ReturnsError<string[], GitCommandError> {
  const args = [
    "ls-files",
    "-z",
    "--others",
    "--ignored",
    "--exclude-standard",
    "--directory",
  ];
  if (paths.length > 0)
    args.push("--", ...paths.map((p) => (p === "" ? "." : p)));
  const { result, error } = execGit(repoRoot, args, {
    env: { GIT_LITERAL_PATHSPECS: "1" },
  });
  if (error) return { error };
  return { result: result.split("\0").filter(Boolean) };
}
