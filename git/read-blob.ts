import type { ReturnsError } from "@saflib/monorepo";
import { GitCommandError } from "./errors.ts";
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

/**
 * Read many blobs in one `git cat-file --batch` invocation.
 * Missing/invalid objects are omitted from the result map (caller treats as miss).
 */
export function readBlobs(
  repoRoot: string,
  blobHashes: readonly string[],
): ReturnsError<Map<string, string>, GitCommandError> {
  const unique = [...new Set(blobHashes.filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) {
    return { result: out };
  }

  const { result: stdout, error } = execGit(
    repoRoot,
    ["cat-file", "--batch"],
    { input: unique.map((h) => `${h}\n`).join("") },
  );
  if (error) return { error };

  let i = 0;
  const len = stdout.length;
  while (i < len) {
    const headerEnd = stdout.indexOf("\n", i);
    if (headerEnd === -1) break;
    const header = stdout.slice(i, headerEnd);
    i = headerEnd + 1;

    if (header.endsWith(" missing")) {
      continue;
    }
    const parts = header.split(" ");
    if (parts.length < 3) {
      return {
        error: new GitCommandError(
          `Unparseable git cat-file --batch header: ${JSON.stringify(header)}`,
          { args: ["cat-file", "--batch"], stderr: "" },
        ),
      };
    }
    const [hash, type, sizeStr] = parts;
    const size = Number(sizeStr);
    if (!Number.isFinite(size) || size < 0) {
      continue;
    }
    if (type === "blob") {
      out.set(hash, stdout.slice(i, i + size));
    }
    i += size;
    if (stdout[i] === "\n") i += 1;
  }

  return { result: out };
}
