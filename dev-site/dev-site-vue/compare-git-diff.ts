/**
 * Shell command for a three-dot diff (same semantics as GitHub compare / `git diff A...B`).
 */
export function formatGitDiffCompareCommand(options: {
  baseRef: string;
  headRef: string;
  /** Repo-relative path prefix (git pathspec). */
  pathPrefix?: string;
}): string {
  const base = options.baseRef.trim();
  const head = options.headRef.trim();
  let cmd = `git diff ${shellWord(base)}...${shellWord(head)}`;
  const path = options.pathPrefix?.replace(/^\/+/, "").replace(/\/+$/, "").trim();
  if (path) {
    cmd += ` -- ${shellWord(path)}`;
  }
  return cmd;
}

/** Quote a ref or path for POSIX sh when it contains shell metacharacters. */
function shellWord(value: string): string {
  if (/^[A-Za-z0-9._/@:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
