import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

/**
 * Writes `content` into the object database as a blob, without touching
 * the working tree or index. Content-addressed — writing the same bytes
 * twice (even for a different logical file) yields the same hash.
 */
export function writeBlob(
  repoRoot: string,
  content: string,
): ReturnsError<string, GitCommandError> {
  const { result, error } = execGit(repoRoot, ["hash-object", "-w", "--stdin"], {
    input: content,
  });
  if (error) return { error };
  return { result: result.trim() };
}
