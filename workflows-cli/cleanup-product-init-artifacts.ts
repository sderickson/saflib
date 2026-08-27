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

function rmQuiet(rel: string): void {
  const full = path.join(saflibRoot, rel);
  if (!existsSync(full)) return;
  rmSync(full, { recursive: true, force: true });
  console.log(`Removed ${rel}`);
}

for (const p of [
  LIVE_TEST_PRODUCT,
  LIVE_TEST_DEPLOY,
  ...SCAFFOLD_CI_PATHS,
]) {
  rmQuiet(p);
}

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
  workspaces?: string[];
};
const before = pkg.workspaces ?? [];
pkg.workspaces = before.filter((w) => w !== `${LIVE_TEST_PRODUCT}/**`);
if (pkg.workspaces.length !== before.length) {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Removed ${LIVE_TEST_PRODUCT}/** from package.json workspaces`);
}

/**
 * Strip live-test product lines from a product/init workflow area, keeping the
 * area markers and any other (non-tmp) body lines.
 */
function stripLiveTestProductFromWorkflowArea(
  filePath: string,
  areaName: string,
): void {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split("\n");
  const beginRe = new RegExp(
    `BEGIN\\b.*WORKFLOW AREA ${areaName} FOR product/init`,
  );
  const endRe = /END WORKFLOW AREA/;
  const productLineRe = new RegExp(`^\\s*-\\s+${LIVE_TEST_PRODUCT}\\s*$`);

  let inArea = false;
  let removed = false;
  const out: string[] = [];
  for (const line of lines) {
    if (beginRe.test(line)) {
      inArea = true;
      out.push(line);
      continue;
    }
    if (inArea && endRe.test(line)) {
      inArea = false;
      out.push(line);
      continue;
    }
    if (inArea && productLineRe.test(line)) {
      removed = true;
      continue;
    }
    out.push(line);
  }
  if (removed) {
    writeFileSync(filePath, out.join("\n"));
    console.log(`Stripped ${LIVE_TEST_PRODUCT} from ${filePath}`);
  }
}

stripLiveTestProductFromWorkflowArea(
  ".github/workflows/unit-tests.yaml",
  "test-product-dependencies",
);

// npm install during product/init refreshes locks for tmp workspaces; drop that
// churn so local live-test runs leave the tree commit-clean.
for (const dir of [saflibRoot, path.dirname(saflibRoot)]) {
  const lockPath = path.join(dir, "package-lock.json");
  if (!existsSync(lockPath)) continue;
  const lockResult = spawnSync(
    "git",
    ["checkout", "--", "package-lock.json"],
    { cwd: dir, encoding: "utf8" },
  );
  if (lockResult.status === 0) {
    console.log(`Restored ${path.relative(saflibRoot, lockPath) || "package-lock.json"}`);
  }
}

console.log("Live-test cleanup done.");
