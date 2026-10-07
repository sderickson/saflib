import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Identity for commits nothing references (e.g. workflow previews). Git
 * refuses to commit without one, and CI runners usually have no
 * `user.name`/`user.email` configured. `GIT_AUTHOR_*` / `GIT_COMMITTER_*`
 * already in the environment still win.
 */
const SYNTHETIC_IDENTITY = {
  GIT_AUTHOR_NAME: "saflib",
  GIT_AUTHOR_EMAIL: "saflib@localhost",
  GIT_COMMITTER_NAME: "saflib",
  GIT_COMMITTER_EMAIL: "saflib@localhost",
};

function identityEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(SYNTHETIC_IDENTITY).filter(([key]) => !process.env[key]),
  );
}

/**
 * Builds a commit object from an existing tree, without touching the
 * working tree, the index, or any ref — the caller decides whether (and
 * how) the result is ever referenced. Uses a fixed identity unless one is set
 * in the environment, so it works where git has no user configured.
 */
export function commitTree(
  repoRoot: string,
  treeHash: string,
  parentHash: string,
  message: string,
): ReturnsError<string, GitCommandError> {
  const { result, error } = execGit(
    repoRoot,
    ["commit-tree", treeHash, "-p", parentHash, "-m", message],
    { env: identityEnv() },
  );
  if (error) return { error };
  return { result: result.trim() };
}
