#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Undo saflib-root mutations from product/init when live-testing inside the
 * saflib repo (product name `tmp`). Safe to run after success or failure.
 *
 *   node ./workflows-cli/cleanup-product-init-artifacts.ts
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

/** Tracked files product/init rewrites during live-test (restore via git). */
const GIT_RESTORE_PATHS = [
  "vitest.config.ts",
  "package.json",
  ".github/workflows/unit-tests.yaml",
  "vue/tsconfig.app.json",
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

function clientAppTsconfigPaths(): string[] {
  const clientsDir = path.join(saflibRoot, "base/clients");
  if (!existsSync(clientsDir)) return [];
  return readdirSync(clientsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      path.join("base/clients", entry.name, "tsconfig.app.json"),
    )
    .filter((rel) => existsSync(path.join(saflibRoot, rel)));
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

if (isGitWorkTree(saflibRoot)) {
  gitRestore(saflibRoot, [
    ...GIT_RESTORE_PATHS,
    ...clientAppTsconfigPaths(),
  ]);
} else {
  removeLiveTestWorkspaces();
}

rmUntrackedScaffoldRootFiles();

// npm install / lock-prune during product/init refresh locks (and product-root
// overrides when saflib is nested); drop that churn so live-test leaves trees clean.
for (const dir of [saflibRoot, path.dirname(saflibRoot)]) {
  if (!isGitWorkTree(dir)) continue;
  gitRestore(dir, ["package-lock.json", "package.json"]);
}

console.log("Live-test cleanup done.");
