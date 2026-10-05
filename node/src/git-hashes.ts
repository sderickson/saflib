import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

let cached: GitHashes | undefined;

/**
 * The commits this process's image was built from: `{ root, saflib }` (product
 * repo and saflib), each with `-dirty` if the build's inputs had uncommitted
 * changes. Images are only rebuilt when their inputs change, so these can be
 * older than the deployed commit.
 *
 * Reads `/etc/saf/build.json`; falls back to the `git-hashes.json` written by
 * the deprecated `saf-git-hashes`, then to `"unknown"`.
 */
export function getGitHashes(): GitHashes {
  if (cached) return cached;
  const fromBuild = getBuildInfo()?.commits;
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
