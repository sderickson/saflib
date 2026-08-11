#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Apply `sideEffects` to all workspace package.json files (M8).
 * Run from repo root: node saflib/imports/scripts/apply-side-effects.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { buildPackageIndex, findMonorepoRoot } from "../src/resolve/index.ts";
import { readRootSafImportsConfig } from "../src/config/read-saf-imports-config.ts";
import { scanPackageSideEffects } from "../src/side-effects/scan-package.ts";

const root = findMonorepoRoot(process.cwd());
const manualOverrides = readRootSafImportsConfig(root).sideEffectsOverrides ?? {};

let updated = 0;
let skipped = 0;

for (const [name, pkg] of buildPackageIndex(root)) {
  const pjPath = path.join(pkg.dir, "package.json");
  const pj = JSON.parse(fs.readFileSync(pjPath, "utf8"));
  if (pj.sideEffects !== undefined) {
    skipped++;
    continue;
  }

  const manual = manualOverrides[name];
  let value;
  if (manual !== undefined) {
    value = manual;
  } else {
    const scan = scanPackageSideEffects(pkg.dir, name);
    value =
      scan.suggestedSideEffects === false ? false : scan.suggestedSideEffects;
  }

  pj.sideEffects = value;
  fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + "\n", "utf8");
  console.log(`${name}: ${JSON.stringify(value)}`);
  updated++;
}

console.log(`Updated ${updated} package(s), skipped ${skipped} (already set).`);
