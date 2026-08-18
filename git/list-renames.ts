import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

export interface GitRename {
  fromPath: string;
  toPath: string;
  /** Similarity 0–100 from `git diff --find-renames` (`R090` → 90). */
  score: number;
}

/**
 * File rename pairs from `fromRef` to `toRef` (`git diff --find-renames -z --name-status --diff-filter=R`).
 */
export function listRenames(
  repoRoot: string,
  fromRef: string,
  toRef: string,
): ReturnsError<GitRename[], GitCommandError> {
  const { result, error } = execGit(repoRoot, [
    "diff",
    "-z",
    "--find-renames",
    "--name-status",
    "--diff-filter=R",
    fromRef,
    toRef,
  ]);
  if (error) return { error };
  return { result: parseRenameNameStatus(result) };
}

export function parseRenameNameStatus(stdout: string): GitRename[] {
  const parts = stdout.split("\0").filter((p) => p.length > 0);
  const out: GitRename[] = [];
  for (let i = 0; i + 2 < parts.length; i += 3) {
    const status = parts[i]!;
    const match = /^R(\d{3})$/.exec(status);
    if (!match) continue;
    out.push({
      fromPath: parts[i + 1]!,
      toPath: parts[i + 2]!,
      score: Number(match[1]),
    });
  }
  return out;
}
