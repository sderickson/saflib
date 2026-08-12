import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Read a blob's contents by hash without checking anything out.
 * Returns the raw file text (git stores blobs without a trailing newline of its
 * own beyond what the file itself contained).
 */
export function readBlob(
  repoRoot: string,
  blobHash: string,
): ReturnsError<string, GitCommandError> {
  return execGit(repoRoot, ["cat-file", "-p", blobHash]);
}
