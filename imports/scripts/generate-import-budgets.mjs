#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Report per-package test import-graph cost (max modules/ext across *.test.ts).
 *
 * Default is **report only** — does not write package.json. Per-package `importBudget`
 * enforcement is deferred; use baseline diff + `measure`/`why` for CI and debugging.
 *
 * Run from repo root:
 *   node saflib/imports/scripts/generate-import-budgets.mjs
 *   node saflib/imports/scripts/generate-import-budgets.mjs --package @pathclerk/daemon-sdk
 *   node saflib/imports/scripts/generate-import-budgets.mjs --write   # opt-in: write importBudget
 */
import fs from "node:fs";
import path from "node:path";
import { buildPackageIndex, findMonorepoRoot } from "../src/resolve/index.ts";
import { measureGraph } from "../src/graph/walk-graph.ts";

const SLACK = 1.15;
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "fixtures",
]);

const args = process.argv.slice(2);
const write = args.includes("--write");
const force = args.includes("--force");
const packageArg = args.find((a) => !a.startsWith("--"));

function listTestFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      listTestFiles(full, out);
    } else if (e.isFile() && e.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function slackCeil(n) {
  return Math.ceil(n * SLACK);
}

function shouldSkipPackage(name) {
  if (name === "@pathclerk/pathclerk") return true;
  if (name.startsWith("template-package")) return true;
  return false;
}

const root = findMonorepoRoot(process.cwd());
const index = buildPackageIndex(root);

const rows = [];
let updated = 0;

for (const [name, pkg] of index) {
  if (packageArg && name !== packageArg) continue;
  if (shouldSkipPackage(name)) continue;

  const tests = listTestFiles(pkg.dir);
  if (tests.length === 0) continue;

  let maxModules = 0;
  let maxExt = 0;
  for (const testFile of tests) {
    const result = measureGraph(testFile, { root });
    maxModules = Math.max(maxModules, result.modules);
    maxExt = Math.max(maxExt, result.ext);
  }

  rows.push({
    name,
    tests: tests.length,
    maxModules,
    maxExt,
    budgetModules: slackCeil(maxModules),
    budgetExt: slackCeil(maxExt),
  });

  if (write) {
    const pjPath = path.join(pkg.dir, "package.json");
    const pj = JSON.parse(fs.readFileSync(pjPath, "utf8"));
    if (pj.importBudget && !force) continue;
    pj.importBudget = {
      testFiles: {
        maxModules: slackCeil(maxModules),
        maxExternalPackages: slackCeil(maxExt),
      },
    };
    fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + "\n", "utf8");
    updated++;
  }
}

rows.sort((a, b) => b.maxModules - a.maxModules);

console.log(
  "package | tests | maxModules | maxExt | budgetModules | budgetExt",
);
for (const r of rows) {
  console.log(
    `${r.name} | ${r.tests} | ${r.maxModules} | ${r.maxExt} | ${r.budgetModules} | ${r.budgetExt}`,
  );
}

if (write) {
  console.log(`\nWrote importBudget to ${updated} package(s).`);
} else {
  console.log(
    `\n${rows.length} package(s) measured (report only). Pass --write to bake importBudget into package.json.`,
  );
}
