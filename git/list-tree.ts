import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";
import type { GitTreeEntry } from "./types.ts";

/**
 * List every blob at `commitHash` (recursive) without checking anything out.
 * Directories / trees / commits / tags are skipped — only `blob` entries are
 * returned. Paths are relative to the repo root.
 *
 * `pathspec`, if given, scopes the listing to one file or directory (e.g.
 * for a workflow preview materializing only the subtree a step touches,
 * without listing the whole repo).
 */
export function listTree(
  repoRoot: string,
  commitHash: string,
  pathspec?: string,
): ReturnsError<GitTreeEntry[], GitCommandError> {
  const args = ["ls-tree", "-r", commitHash];
  if (pathspec) args.push("--", pathspec);
  const { result: stdout, error } = execGit(repoRoot, args);
  if (error) {
    return { error };
  }

  const entries: GitTreeEntry[] = [];
  if (!stdout.trim()) {
    return { result: entries };
  }

  for (const line of stdout.replace(/\n$/, "").split("\n")) {
    // <mode> <type> <hash>\t<path>
    const tab = line.indexOf("\t");
    if (tab === -1) {
      return {
        error: new GitCommandError(
          `Unparseable git ls-tree line: ${JSON.stringify(line)}`,
          { args, stderr: "" },
        ),
      };
    }
    const meta = line.slice(0, tab);
    const path = line.slice(tab + 1);
    const parts = meta.split(" ");
    if (parts.length !== 3) {
      return {
        error: new GitCommandError(
          `Unparseable git ls-tree meta: ${JSON.stringify(meta)}`,
          { args, stderr: "" },
        ),
      };
    }
    const [, type, blobHash] = parts;
    if (type !== "blob") continue;
    entries.push({ path, blobHash });
  }
  return { result: entries };
}
