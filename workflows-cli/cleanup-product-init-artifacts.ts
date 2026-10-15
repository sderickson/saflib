#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Undo saflib-root mutations from product/init when live-testing inside the
 * saflib repo (product name `tmp`). Safe to run after success or failure.
 *
 *   node ./workflows-cli/cleanup-product-init-artifacts.ts
 */
import {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  LIVE_TEST_SNAPSHOT_ENV,
  SAFLIB_RESTORE_PATHS,
  clientAppTsconfigPaths,
  readLiveTestSnapshot,
  restoreLiveTestSnapshot,
} from "./live-test/snapshot.ts";

const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
process.chdir(saflibRoot);

const LIVE_TEST_PRODUCT = "tmp";
const LIVE_TEST_DEPLOY = "tmp-deploy";

/** Scaffold CI copied into saflib by product/init — never keep these here. */
const SCAFFOLD_CI_PATHS = [
  ".github/workflows/playwright.yml",
  ".github/workflows/typecheck.yml",
  ".github/workflows/push.yml",
  ".github/workflows/security.yml",
  ".github/actions/setup-node-deps",
] as const;

/** Scaffold dotfiles copied to saflib root when missing (untracked in saflib). */
const SCAFFOLD_ROOT_DOTFILES = [
  "eslint.config.js",
  ".prettierrc.json",
] as const;

function rmQuiet(rel: string): void {
  const full = path.join(saflibRoot, rel);
  if (!existsSync(full)) return;
  rmSync(full, { recursive: true, force: true });
  console.log(`Removed ${rel}`);
}

function isGitWorkTree(cwd: string): boolean {
  return (
    spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      encoding: "utf8",
    }).stdout.trim() === "true"
  );
}

function gitRestore(cwd: string, relPaths: readonly string[]): void {
  const existing = relPaths.filter((rel) => existsSync(path.join(cwd, rel)));
  if (existing.length === 0) return;
  const result = spawnSync("git", ["checkout", "--", ...existing], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) return;
  for (const rel of existing) {
    const label = path.relative(saflibRoot, path.join(cwd, rel)) || rel;
    console.log(`Restored ${label}`);
  }
}

function removeLiveTestWorkspaces(): void {
  const pkgPath = path.join(saflibRoot, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    workspaces?: string[];
  };
  const before = pkg.workspaces ?? [];
  const drop = new Set([
    `${LIVE_TEST_PRODUCT}/**`,
    `${LIVE_TEST_DEPLOY}/**`,
  ]);
  pkg.workspaces = before.filter((w) => !drop.has(w));
  if (pkg.workspaces.length !== before.length) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(
      `Removed live-test workspaces from package.json (${[...drop].join(", ")})`,
    );
  }
}

function rmUntrackedScaffoldRootFiles(): void {
  for (const rel of SCAFFOLD_ROOT_DOTFILES) {
    const full = path.join(saflibRoot, rel);
    if (!existsSync(full)) continue;
    const tracked = spawnSync("git", ["ls-files", "--error-unmatch", rel], {
      cwd: saflibRoot,
      encoding: "utf8",
    });
    if (tracked.status === 0) continue;
    rmSync(full);
    console.log(`Removed untracked ${rel}`);
  }
}

for (const p of [
  LIVE_TEST_PRODUCT,
  LIVE_TEST_DEPLOY,
  ...SCAFFOLD_CI_PATHS,
]) {
  rmQuiet(p);
}

// live-test snapshots the files it will touch (see live-test/snapshot.ts) and
// passes the snapshot here; restoring from it keeps uncommitted edits, which a
// `git checkout` would discard. Without one (cleanup run by hand), fall back to
// git for saflib's own files, but never touch the parent repo's.
const snapshotFile = process.env[LIVE_TEST_SNAPSHOT_ENV];
const snapshot = snapshotFile ? readLiveTestSnapshot(snapshotFile) : undefined;

if (snapshot) {
  const restored = restoreLiveTestSnapshot(saflibRoot, snapshot);
  for (const rel of restored) {
    console.log(`Restored ${rel}`);
  }
  // Left for live-test to delete: the live-test workflow runs this script as a
  // step and live-test runs it again at exit, and both need the snapshot.
  // The parent's node_modules was installed against the live-test's package
  // files; reinstall so it matches the restored ones again (a mismatched
  // install once paired one rolldown with another's native binary).
  if (restored.some((rel) => rel === "../package.json" || rel === "../package-lock.json")) {
    console.log("Reinstalling the parent repo's dependencies to match its restored lockfile…");
    const install = spawnSync("npm", ["install"], {
      cwd: path.dirname(saflibRoot),
      stdio: "inherit",
    });
    if (install.status !== 0) {
      console.error("npm install in the parent repo failed; run it by hand.");
    }
  }
} else if (isGitWorkTree(saflibRoot)) {
  gitRestore(saflibRoot, [
    ...SAFLIB_RESTORE_PATHS,
    ...clientAppTsconfigPaths(saflibRoot),
  ]);
  if (existsSync(path.join(saflibRoot, "..", "package.json"))) {
    console.log(
      "No live-test snapshot, so the parent repo's package.json, package-lock.json, and tsconfig.json were left as they are; check them for live-test changes.",
    );
  }
} else {
  removeLiveTestWorkspaces();
}

rmUntrackedScaffoldRootFiles();

console.log("Live-test cleanup done.");
