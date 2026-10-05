import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * A throwaway git index, seeded from a real commit's tree, that a caller
 * can mutate (via {@link setIndexEntry}) and flush (via {@link writeTree})
 * to build a new tree without ever touching the repo's real index or
 * working tree. Only holds path/mode/hash entries, never blob content —
 * cheap regardless of how large the changed files are.
 */
export interface ScratchIndex {
  repoRoot: string;
  indexPath: string;
  tmpDir: string;
}

/** Opens a scratch index seeded from `baseHash`'s tree. */
export function openScratchIndex(
  repoRoot: string,
  baseHash: string,
): ReturnsError<ScratchIndex, GitCommandError> {
  const tmpDir = mkdtempSync(join(tmpdir(), "saflib-git-scratch-index-"));
  const indexPath = join(tmpDir, "index");
  const scratch: ScratchIndex = { repoRoot, indexPath, tmpDir };
  const { error } = execGit(repoRoot, ["read-tree", baseHash], {
    env: { GIT_INDEX_FILE: indexPath },
  });
  if (error) return { error };
  return { result: scratch };
}

/** Stages `path` (repo-relative) at `blobHash`, mode `100644` (regular file). */
export function setIndexEntry(
  scratch: ScratchIndex,
  path: string,
  blobHash: string,
): ReturnsError<void, GitCommandError> {
  const { error } = execGit(
    scratch.repoRoot,
    ["update-index", "--add", "--cacheinfo", `100644,${blobHash},${path}`],
    { env: { GIT_INDEX_FILE: scratch.indexPath } },
  );
  if (error) return { error };
  return { result: undefined };
}

/** Writes the scratch index's current contents out as a tree object. */
export function writeScratchTree(
  scratch: ScratchIndex,
): ReturnsError<string, GitCommandError> {
  const { result, error } = execGit(scratch.repoRoot, ["write-tree"], {
    env: { GIT_INDEX_FILE: scratch.indexPath },
  });
  if (error) return { error };
  return { result: result.trim() };
}

/** Deletes the scratch index's backing temp file/directory. */
export function closeScratchIndex(scratch: ScratchIndex): void {
  rmSync(scratch.tmpDir, { recursive: true, force: true });
}
