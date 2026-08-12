import type { ReturnsError } from "@saflib/monorepo";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";
import type { GitTreeEntry } from "./types.ts";

/**
 * List every blob at `commitHash` (recursive) without checking anything out.
 * Directories / trees / commits / tags are skipped — only `blob` entries are
 * returned. Paths are relative to the repo root.
 */
export function listTree(
  repoRoot: string,
  commitHash: string,
): ReturnsError<GitTreeEntry[], GitCommandError> {
  const args = ["ls-tree", "-r", commitHash];
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
