/**
 * In-process caches for git plumbing reads keyed by immutable object hashes.
 *
 * One API request (a commit diff, a package panel) runs several assemblers
 * that each list the whole tree and read every package.json at the same
 * commit. A full commit hash always names the same tree and a blob hash the
 * same bytes, so those reads are cached; symbolic refs (`main`, short hashes)
 * pass straight through to git.
 */
import {
  listTree,
  readBlobs,
  type GitCommandError,
  type GitTreeEntry,
} from "@saflib/git";
import type { ReturnsError } from "@saflib/utils";

const FULL_HASH = /^[0-9a-f]{40}$/;
const MAX_TREES = 16;
const MAX_BLOBS = 20_000;

/** Insertion-ordered map that drops its oldest entries past `max`. */
class BoundedCache<V> {
  private readonly map = new Map<string, V>();
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) {
      this.map.delete(this.map.keys().next().value!);
    }
  }

  clear(): void {
    this.map.clear();
  }
}

const trees = new BoundedCache<GitTreeEntry[]>(MAX_TREES);
const blobs = new BoundedCache<string>(MAX_BLOBS);

/**
 * {@link listTree} over the whole repo, cached when `commitHash` is a full
 * hash. Callers must not mutate the returned array.
 */
export function listTreeCached(
  repoRoot: string,
  commitHash: string,
): ReturnsError<readonly GitTreeEntry[], GitCommandError> {
  if (!FULL_HASH.test(commitHash)) return listTree(repoRoot, commitHash);
  const key = `${repoRoot}\0${commitHash}`;
  const hit = trees.get(key);
  if (hit) return { result: hit };
  const listed = listTree(repoRoot, commitHash);
  if (listed.result) trees.set(key, listed.result);
  return listed;
}

/** {@link readBlobs} with blob texts cached by hash; only misses reach git. */
export function readBlobsCached(
  repoRoot: string,
  blobHashes: readonly string[],
): ReturnsError<Map<string, string>, GitCommandError> {
  const out = new Map<string, string>();
  const missing: string[] = [];
  for (const hash of new Set(blobHashes)) {
    if (!hash) continue;
    const hit = blobs.get(`${repoRoot}\0${hash}`);
    if (hit !== undefined) out.set(hash, hit);
    else missing.push(hash);
  }
  if (missing.length === 0) return { result: out };
  const read = readBlobs(repoRoot, missing);
  if (read.error) return { error: read.error };
  for (const [hash, text] of read.result) {
    blobs.set(`${repoRoot}\0${hash}`, text);
    out.set(hash, text);
  }
  return { result: out };
}

/** Test hook: drop all cached trees and blobs. */
export function clearGitCache(): void {
  trees.clear();
  blobs.clear();
}
