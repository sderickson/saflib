import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  statSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ReturnsError } from "@saflib/utils";
import { GitCommandError } from "./errors.ts";
import { execGit } from "./exec-git.ts";
import { closeScratchIndex, type ScratchIndex } from "./scratch-tree.ts";

/**
 * Pathspecs are passed through verbatim — `[`, `*`, `?` in a directory name
 * are literal characters, never globs.
 */
const LITERAL_PATHSPECS = { GIT_LITERAL_PATHSPECS: "1" };

/**
 * Object hash of `path` (repo-relative) at `rev` — a tree hash for a
 * directory, a blob hash for a file. Empty `path` means the root tree.
 *
 * Because git content-addresses trees, two revs with identical content under
 * `path` return the same hash regardless of history (rebases, squashes and
 * reverts included).
 */
export function treeHash(
  repoRoot: string,
  rev: string,
  path: string,
): ReturnsError<string, GitCommandError> {
  const spec = path === "" ? `${rev}^{tree}` : `${rev}:${path}`;
  const { result, error } = execGit(repoRoot, ["rev-parse", "--verify", spec]);
  if (error) return { error };
  return { result: result.trim() };
}

/**
 * Batch form of {@link treeHash}: the object hash of every path at `treeish`
 * (a commit or tree) in one `ls-tree` call. Missing paths map to `null`.
 * A submodule path maps to its gitlink — the submodule commit it points at.
 * (`ls-tree` rather than `cat-file --batch-check`, which reports gitlinks as
 * missing because the submodule's commit isn't in this repo's object store.)
 */
export function objectHashesAt(
  repoRoot: string,
  treeish: string,
  paths: readonly string[],
): ReturnsError<Map<string, string | null>, GitCommandError> {
  const out = new Map<string, string | null>(paths.map((p) => [p, null]));
  if (paths.includes("")) {
    const { result, error } = treeHash(repoRoot, treeish, "");
    if (error) return { error };
    out.set("", result);
  }
  for (const batch of nonOverlappingBatches(paths.filter((p) => p !== ""))) {
    const { result, error } = execGit(repoRoot, [
      "ls-tree",
      "-z",
      treeish,
      "--",
      ...batch,
    ]);
    if (error) return { error };
    for (const record of result.split("\0")) {
      // <mode> <type> <hash>\t<path>
      const tab = record.indexOf("\t");
      if (tab === -1) continue;
      const entryPath = record.slice(tab + 1);
      if (out.has(entryPath))
        out.set(entryPath, record.slice(0, tab).split(" ")[2]);
    }
  }
  return { result: out };
}

/**
 * `ls-tree a a/b` descends into `a` to reach `a/b` instead of listing `a`
 * itself, so a path and its ancestor must be looked up in separate calls.
 */
function nonOverlappingBatches(paths: readonly string[]): string[][] {
  const batches: string[][] = [];
  const overlaps = (a: string, b: string) =>
    a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
  for (const p of paths) {
    const batch = batches.find(
      (existing) => !existing.some((q) => overlaps(p, q)),
    );
    if (batch) batch.push(p);
    else batches.push([p]);
  }
  return batches;
}

export interface WorkingTreeHashes {
  /**
   * Object hash per requested path, reflecting the working tree (tracked
   * modifications, deletions, and untracked-but-not-ignored files).
   * `null` when the path has no git-visible content (doesn't exist, or is
   * entirely ignored).
   */
  hashes: Record<string, string | null>;
  /** Paths whose working-tree hash differs from `HEAD`'s. */
  dirtyPaths: string[];
  /** `true` when any requested path differs from `HEAD`. */
  dirty: boolean;
}

/**
 * Like {@link treeHash} at `HEAD`, but for the *working tree*: uncommitted
 * edits, deletions and new (non-ignored) files under `paths` are included.
 *
 * Works on a scratch copy of the repo's index (falling back to `HEAD`'s tree
 * when there is no index yet), so the real index and working tree are never
 * touched. Copying the real index — rather than seeding from `HEAD` — keeps
 * git's stat cache, so unchanged files aren't re-hashed.
 *
 * Paths are repo-relative. Paths inside a submodule hash to the submodule's
 * gitlink (its checked-out commit), not its working tree — resolve such paths
 * against the submodule with {@link repoRootFor} first.
 */
export function workingTreeHashes(
  repoRoot: string,
  paths: readonly string[],
): ReturnsError<WorkingTreeHashes, GitCommandError> {
  const tmpDir = mkdtempSync(join(tmpdir(), "saflib-git-working-tree-"));
  const scratch: ScratchIndex = {
    repoRoot,
    indexPath: join(tmpDir, "index"),
    tmpDir,
  };
  try {
    return computeWorkingTreeHashes(scratch, paths);
  } finally {
    closeScratchIndex(scratch);
  }
}

function computeWorkingTreeHashes(
  scratch: ScratchIndex,
  paths: readonly string[],
): ReturnsError<WorkingTreeHashes, GitCommandError> {
  const { repoRoot, indexPath } = scratch;
  const env = { GIT_INDEX_FILE: indexPath };
  const pathspecEnv = { ...env, ...LITERAL_PATHSPECS };

  const head = execGit(repoRoot, ["rev-parse", "--verify", "-q", "HEAD"]);
  const headHash = head.error ? null : head.result.trim();

  const realIndex = execGit(repoRoot, [
    "rev-parse",
    "--path-format=absolute",
    "--git-path",
    "index",
  ]);
  if (realIndex.error) return { error: realIndex.error };
  const realIndexPath = realIndex.result.trim();
  if (existsSync(realIndexPath)) {
    copyFileSync(realIndexPath, indexPath);
    // Git treats entries modified at/after the index's own mtime as "racily
    // clean" and re-hashes them. A fresh copy's mtime would be *now*, hiding
    // same-size edits made within the same tick as the last index write —
    // so keep the original's (ms precision only rounds it earlier, which is
    // the safe direction).
    const { atime, mtime } = statSync(realIndexPath);
    utimesSync(indexPath, atime, mtime);
  } else if (headHash) {
    const { error } = execGit(repoRoot, ["read-tree", headHash], { env });
    if (error) return { error };
  }

  const ignored = ignoredPaths(repoRoot, paths, env);
  if (ignored.error) return { error: ignored.error };
  // `git add` refuses a pathspec that is itself ignored; such a path is
  // simply absent from git's view of the working tree.
  const present = paths.filter(
    (p) =>
      p === "" || (existsSync(join(repoRoot, p)) && !ignored.result.has(p)),
  );
  const absent = paths.filter((p) => p !== "" && !present.includes(p));

  if (present.length > 0) {
    const specs = present.map((p) => (p === "" ? "." : p));
    const { error } = execGit(repoRoot, ["add", "-A", "--", ...specs], {
      env: pathspecEnv,
    });
    if (error) return { error };
  }
  if (absent.length > 0) {
    const { error } = execGit(
      repoRoot,
      ["rm", "-r", "-q", "--cached", "--ignore-unmatch", "--", ...absent],
      { env: pathspecEnv },
    );
    if (error) return { error };
  }

  const tree = execGit(repoRoot, ["write-tree"], { env });
  if (tree.error) return { error: tree.error };
  const scratchTree = tree.result.trim();

  const working = objectHashesAt(repoRoot, scratchTree, paths);
  if (working.error) return { error: working.error };
  const committed = headHash
    ? objectHashesAt(repoRoot, headHash, paths)
    : { result: new Map<string, string | null>() };
  if (committed.error) return { error: committed.error };

  const hashes: Record<string, string | null> = {};
  const dirtyPaths: string[] = [];
  for (const p of paths) {
    const hash = working.result.get(p) ?? null;
    hashes[p] = hash;
    if (hash !== (committed.result.get(p) ?? null)) dirtyPaths.push(p);
  }
  return { result: { hashes, dirtyPaths, dirty: dirtyPaths.length > 0 } };
}

/** Untracked paths matched by an ignore rule (tracked paths never are). */
function ignoredPaths(
  repoRoot: string,
  paths: readonly string[],
  env: Record<string, string>,
): ReturnsError<Set<string>, GitCommandError> {
  const candidates = paths.filter((p) => p !== "");
  if (candidates.length === 0) return { result: new Set() };
  const { result, error } = execGit(
    repoRoot,
    ["check-ignore", "--stdin", "-z"],
    { env, input: candidates.join("\0") + "\0" },
  );
  // Exit 1 = none of the paths are ignored.
  if (error) return error.exitCode === 1 ? { result: new Set() } : { error };
  return { result: new Set(result.split("\0").filter(Boolean)) };
}

/**
 * The root of the innermost git repository containing `path` — for a path
 * inside a submodule, the submodule's root. `path` need not exist; the
 * nearest existing ancestor directory is used.
 */
export function repoRootFor(
  path: string,
): ReturnsError<string, GitCommandError> {
  let dir = isAbsolute(path) ? path : resolve(path);
  while (!existsSync(dir) || !statSync(dir).isDirectory()) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const { result, error } = execGit(dir, ["rev-parse", "--show-toplevel"]);
  if (error) return { error };
  return { result: result.trim() };
}
