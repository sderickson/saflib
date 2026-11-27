import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export interface GitHashes {
  root: string;
  saflib: string;
}

/**
 * Build metadata written into images by `saf-docker build` (see
 * `@saflib/docker` `BuildInfo`). Only the fields read here are typed.
 */
export interface BuildInfo {
  buildRef?: string;
  image?: string;
  inputHash?: string;
  commits?: Partial<GitHashes>;
  dirty?: boolean;
  platform?: string;
  builtAt?: string;
  upstream?: string[];
}

const defaultHashes: GitHashes = { root: "unknown", saflib: "unknown" };

/** `/etc/saf` in images; overridable for tests and non-standard layouts. */
function buildInfoDir(): string {
  return process.env.SAF_BUILD_INFO_DIR ?? "/etc/saf";
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}

/**
 * This image's build info (`/etc/saf/build.json`), or `undefined` outside an
 * image built by `saf-docker build`.
 */
export function getBuildInfo(): BuildInfo | undefined {
  return readJson<BuildInfo>(join(buildInfoDir(), "build.json"));
}

/**
 * The release a deploy shipped (`saf-deploy` writes `release/release.json`
 * into remote-assets; compose mounts it at `/etc/saf/release/`). Unlike
 * {@link BuildInfo}, it changes on every deploy, including config-only ones.
 */
export interface ReleaseInfo {
  released_at?: string;
  commits?: Partial<GitHashes>;
  assets_hash?: string;
}

/** The mounted release stamp, or `undefined` when none is mounted (dev, tests). */
export function getReleaseInfo(): ReleaseInfo | undefined {
  return readJson<ReleaseInfo>(join(buildInfoDir(), "release", "release.json"));
}

/**
 * Build infos of this image and every upstream build baked into it
 * (`/etc/saf/builds/*.json`), for diagnostics.
 */
export function listBuildInfos(): BuildInfo[] {
  const dir = join(buildInfoDir(), "builds");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap((file) => readJson<BuildInfo>(join(dir, file)) ?? []);
}

/** The git dir for a checkout: `.git` itself, or where a `.git` file points. */
function gitDirOf(checkout: string): string | undefined {
  const dotGit = join(checkout, ".git");
  try {
    const text = readFileSync(dotGit, "utf8");
    const m = text.match(/^gitdir:\s*(.+)\s*$/m);
    return m ? resolve(checkout, m[1]!.trim()) : undefined;
  } catch {
    return existsSync(dotGit) ? dotGit : undefined;
  }
}

/**
 * The commit checked out at `checkout`, read straight from its git files (no
 * git binary needed): HEAD, a loose ref, or `packed-refs`.
 */
export function readCheckoutHead(checkout: string): string | undefined {
  const gitDir = gitDirOf(checkout);
  if (!gitDir) return undefined;
  let head: string;
  try {
    head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
  } catch {
    return undefined;
  }
  if (/^[0-9a-f]{40}$/.test(head)) return head;
  const ref = head.match(/^ref:\s*(.+)$/)?.[1];
  if (!ref) return undefined;
  // Linked worktrees keep shared refs in the common dir.
  const common = (() => {
    try {
      return resolve(gitDir, readFileSync(join(gitDir, "commondir"), "utf8").trim());
    } catch {
      return gitDir;
    }
  })();
  for (const dir of [gitDir, common]) {
    try {
      const sha = readFileSync(join(dir, ref), "utf8").trim();
      if (/^[0-9a-f]{40}$/.test(sha)) return sha;
    } catch {
      // Not a loose ref here; try packed-refs.
    }
    try {
      for (const line of readFileSync(join(dir, "packed-refs"), "utf8").split("\n")) {
        const [sha, name] = line.trim().split(" ");
        if (name === ref && sha && /^[0-9a-f]{40}$/.test(sha)) return sha;
      }
    } catch {
      // No packed-refs.
    }
  }
  return undefined;
}

/**
 * Dev stacks bind-mount the checkout and set `SAF_GIT_WORKTREE` to it, so the
 * hashes follow what's checked out rather than when the dev image was built.
 */
function fromWorktree(): Partial<GitHashes> | undefined {
  const root = process.env.SAF_GIT_WORKTREE;
  if (!root) return undefined;
  const rootSha = readCheckoutHead(root);
  // Products have saflib as a submodule; in saflib itself it's the root.
  const saflibSha = existsSync(join(root, "saflib")) ? readCheckoutHead(join(root, "saflib")) : rootSha;
  if (!rootSha && !saflibSha) return undefined;
  return { root: rootSha, saflib: saflibSha };
}

let cached: GitHashes | undefined;

/**
 * The commits this process's image was built from: `{ root, saflib }` (product
 * repo and saflib), each with `-dirty` if the build's inputs had uncommitted
 * changes. Images are only rebuilt when their inputs change, so these can be
 * older than the deployed commit.
 *
 * In a dev stack with `SAF_GIT_WORKTREE` set, reads the mounted checkout's
 * HEAD instead. Otherwise reads `/etc/saf/build.json`; falls back to the
 * `git-hashes.json` written by the deprecated `saf-git-hashes`, then to
 * `"unknown"`.
 */
export function getGitHashes(): GitHashes {
  if (cached) return cached;
  const fromBuild = fromWorktree() ?? getBuildInfo()?.commits;
  const legacy = fromBuild
    ? undefined
    : readJson<Partial<GitHashes>>(
        join(dirname(fileURLToPath(import.meta.url)), "..", "git-hashes.json"),
      );
  const data = fromBuild ?? legacy;
  cached = data
    ? { root: data.root ?? "unknown", saflib: data.saflib ?? "unknown" }
    : defaultHashes;
  return cached;
}

/** Clears the memoized {@link getGitHashes} result (for tests). */
export function resetGitHashesCache(): void {
  cached = undefined;
}
