import type { ReturnsError } from "@saflib/utils";
import type { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";

export const DEFAULT_MAX_DIFF_BYTES = 512_000;

/**
 * Unified diff between two refs (`git diff from...to`), optionally scoped with a pathspec.
 */
export function diffRefs(
  repoRoot: string,
  fromRef: string,
  toRef: string,
  options?: { pathPrefix?: string; maxBytes?: number },
): ReturnsError<{ text: string; truncated: boolean }, GitCommandError> {
  const args = ["diff", `${fromRef}...${toRef}`];
  const prefix = options?.pathPrefix?.replace(/^\/+/, "").replace(/\/+$/, "").trim();
  if (prefix) {
    args.push("--", prefix);
  }
  const { result, error } = execGit(repoRoot, args);
  if (error) return { error };

  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_DIFF_BYTES;
  const bytes = Buffer.byteLength(result, "utf8");
  if (bytes <= maxBytes) {
    return { result: { text: result, truncated: false } };
  }
  const slice = result.slice(0, maxBytes);
  return {
    result: {
      text: `${slice}\n\n… diff output truncated (${bytes} bytes) …\n`,
      truncated: true,
    },
  };
}
