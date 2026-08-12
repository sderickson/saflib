/** One commit returned by {@link log}. */
export interface GitCommit {
  /** Full 40-char commit object hash. */
  hash: string;
  /** Parent commit hashes (empty for the root commit). */
  parentHashes: string[];
  /** Author date as an ISO-8601 string (`%aI`). */
  authoredAt: string;
  /** First line of the commit message (`%s`). */
  subject: string;
}

/** One tree entry returned by {@link listTree} (blobs only). */
export interface GitTreeEntry {
  /** Path relative to the repo root. */
  path: string;
  /** Blob object hash. */
  blobHash: string;
}

export interface LogOptions {
  /**
   * Ref to walk (branch name, tag, or commit hash). Defaults to `"HEAD"`.
   * Walked with `--first-parent` so merge commits don't fan out.
   */
  ref?: string;
  /**
   * Exclusive lower bound as a commit hash: walks `since..ref` (commits reachable
   * from `ref` but not from `since`). This is a hash cursor, not git's date-based
   * `--since` flag — matching the "ingest commits since the last recorded one"
   * scan use case.
   */
  since?: string;
  /** Max commits to return (`-n`). */
  limit?: number;
}
