/**
 * Snapshot of files live-test rewrites outside `tmp/`, so cleanup can put
 * back exactly what was there — uncommitted edits included — instead of
 * `git checkout`-ing them to the last commit.
 *
 * Matters most when saflib is nested in a product repo: product/init runs
 * `npm install`, which rewrites the parent's package.json and lock, and a
 * git restore there silently threw away whatever the developer had pending.
 */
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Env var live-test sets so the separate cleanup script finds the snapshot. */
export const LIVE_TEST_SNAPSHOT_ENV = "SAFLIB_LIVE_TEST_SNAPSHOT";

/** Tracked saflib files product/init rewrites during live-test. */
export const SAFLIB_RESTORE_PATHS = [
  "vitest.config.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  ".github/workflows/unit-tests.yaml",
  "vue/tsconfig.app.json",
] as const;

/** Parent-repo files `npm install` rewrites when saflib is nested in a product. */
const PARENT_RESTORE_PATHS = ["package.json", "package-lock.json", "tsconfig.json"] as const;

export function clientAppTsconfigPaths(saflibRoot: string): string[] {
  const clientsDir = path.join(saflibRoot, "base/clients");
  if (!existsSync(clientsDir)) return [];
  return readdirSync(clientsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join("base/clients", entry.name, "tsconfig.app.json"))
    .filter((rel) => existsSync(path.join(saflibRoot, rel)));
}

/** Whether saflib sits inside a product repo (a parent with its own package.json). */
export function hasParentProduct(saflibRoot: string): boolean {
  return existsSync(path.join(saflibRoot, "..", "package.json"));
}

/** Every file live-test should snapshot before running, relative to the saflib root. */
export function liveTestSnapshotPaths(saflibRoot: string): string[] {
  return [
    ...SAFLIB_RESTORE_PATHS,
    ...clientAppTsconfigPaths(saflibRoot),
    ...(hasParentProduct(saflibRoot) ? PARENT_RESTORE_PATHS.map((p) => `../${p}`) : []),
  ];
}

/** Paths are relative to the saflib root; `../` ones are the parent repo's. */
export type LiveTestSnapshot = Record<string, string | null>;

/** Writes the snapshot of `relPaths` (null for missing files) and returns its path. */
export function writeLiveTestSnapshot(saflibRoot: string, relPaths: string[]): string {
  const snapshot: LiveTestSnapshot = {};
  for (const rel of relPaths) {
    const full = path.join(saflibRoot, rel);
    snapshot[rel] = existsSync(full) ? readFileSync(full, "utf8") : null;
  }
  const file = path.join(mkdtempSync(path.join(tmpdir(), "saflib-live-test-")), "snapshot.json");
  writeFileSync(file, JSON.stringify(snapshot));
  return file;
}

export function readLiveTestSnapshot(file: string): LiveTestSnapshot | undefined {
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as LiveTestSnapshot;
}

/** Puts every snapshotted file back as it was; removes ones that didn't exist. Returns the restored paths. */
export function restoreLiveTestSnapshot(saflibRoot: string, snapshot: LiveTestSnapshot): string[] {
  const restored: string[] = [];
  for (const [rel, content] of Object.entries(snapshot)) {
    const full = path.join(saflibRoot, rel);
    if (content === null) {
      if (existsSync(full)) {
        rmSync(full);
        restored.push(rel);
      }
      continue;
    }
    if (!existsSync(full) || readFileSync(full, "utf8") !== content) {
      writeFileSync(full, content);
      restored.push(rel);
    }
  }
  return restored;
}

export function removeLiveTestSnapshot(file: string): void {
  rmSync(path.dirname(file), { recursive: true, force: true });
}
