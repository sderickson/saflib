import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit, execGitBuffer } from "./exec-git.ts";

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
 *
 * Parses stdout as a {@link Buffer}: git's size field is in **bytes**, so decoding
 * to a UTF-8 string before slicing desyncs on any multi-byte content.
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

  const { result: stdout, error } = execGitBuffer(
    repoRoot,
    ["cat-file", "--batch"],
    { input: unique.map((h) => `${h}\n`).join("") },
  );
  if (error) return { error };

  let i = 0;
  const len = stdout.length;
  while (i < len) {
    const headerEnd = stdout.indexOf(0x0a, i);
    if (headerEnd === -1) break;
    const header = stdout.subarray(i, headerEnd).toString("utf8");
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
    if (!Number.isFinite(size) || size < 0 || i + size > len) {
      return {
        error: new GitCommandError(
          `Invalid git cat-file --batch size in header: ${JSON.stringify(header)}`,
          { args: ["cat-file", "--batch"], stderr: "" },
        ),
      };
    }
    if (type === "blob") {
      out.set(hash, stdout.subarray(i, i + size).toString("utf8"));
    }
    i += size;
    if (stdout[i] === 0x0a) i += 1;
  }

  return { result: out };
}
