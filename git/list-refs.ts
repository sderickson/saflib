import type { ReturnsError } from "@saflib/utils";
import type { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

export interface GitRef {
  /** Short ref name (e.g. `main`, `feature/foo`) without `refs/heads/` / `refs/tags/`. */
  name: string;
  /** Object hash the ref points to. */
  hash: string;
  type: "branch" | "tag";
}

/**
 * List local branch and tag refs via `git for-each-ref`.
 * Does not include remote-tracking refs.
 */
export function listRefs(
  repoRoot: string,
): ReturnsError<GitRef[], GitCommandError> {
  const args = [
    "for-each-ref",
    "--format=%(objectname)%00%(refname)",
    "refs/heads",
    "refs/tags",
  ];
  const { result: stdout, error } = execGit(repoRoot, args);
  if (error) return { error };

  const refs: GitRef[] = [];
  if (!stdout.trim()) return { result: refs };

  for (const line of stdout.replace(/\n$/, "").split("\n")) {
    if (!line) continue;
    const [hash, refname] = line.split("\0");
    if (!hash || !refname) continue;
    if (refname.startsWith("refs/heads/")) {
      refs.push({
        hash,
        name: refname.slice("refs/heads/".length),
        type: "branch",
      });
    } else if (refname.startsWith("refs/tags/")) {
      refs.push({
        hash,
        name: refname.slice("refs/tags/".length),
        type: "tag",
      });
    }
  }
  return { result: refs };
}
