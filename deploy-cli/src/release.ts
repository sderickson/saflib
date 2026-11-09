import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readRepoCommits } from "@saflib/docker/git-hashes";

/**
 * What a deploy shipped, written into the uploaded remote-assets as
 * `release/release.json` and mounted into services at `/etc/saf/release/`.
 * Services record it on boot (the ops API's deploys), so a deploy that only
 * changes config (Kratos, Caddy) or another image still shows up.
 */
export interface ReleaseStamp {
  released_at: string;
  /** HEAD commits of the deploying checkout (`-dirty` when uncommitted). */
  commits: { root: string; saflib: string };
  /** sha256 over remote-assets' file paths and contents. */
  assets_hash: string;
}

export const RELEASE_DIR = "release";
export const RELEASE_FILE = "release.json";

function listFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const rel = prefix ? `${prefix}/${name}` : name;
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? listFiles(full, rel) : [rel];
    });
}

/** Content hash of a directory tree, stable across machines. */
export function hashDirectory(dir: string): string {
  const hash = createHash("sha256");
  for (const rel of listFiles(dir)) {
    if (rel === `${RELEASE_DIR}/${RELEASE_FILE}`) continue;
    hash.update(rel).update("\0").update(readFileSync(path.join(dir, rel))).update("\0");
  }
  return hash.digest("hex");
}

export function makeReleaseStamp(
  assetsDir: string,
  options: { now?: Date; commits?: ReleaseStamp["commits"] } = {},
): ReleaseStamp {
  return {
    released_at: (options.now ?? new Date()).toISOString(),
    commits: options.commits ?? readRepoCommits(assetsDir),
    assets_hash: hashDirectory(assetsDir),
  };
}

/** Write `<outDir>/release/release.json`; returns its path. */
export function writeReleaseStamp(outDir: string, stamp: ReleaseStamp): string {
  const dir = path.join(outDir, RELEASE_DIR);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, RELEASE_FILE);
  writeFileSync(file, JSON.stringify(stamp, null, 2) + "\n", "utf8");
  return file;
}
