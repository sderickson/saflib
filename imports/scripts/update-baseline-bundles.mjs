#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Patch a snapshot JSON `bundles` section from current dist manifest + spa measure.
 * Run after client build (see safImports.snapshot.bundles.buildWorkspace).
 *
 * Usage: node saflib/imports/scripts/update-baseline-bundles.mjs --baseline <path>
 */
import fs from "node:fs";
import path from "node:path";
import { findMonorepoRoot } from "../src/resolve/index.ts";
import { readRootSafImportsConfig } from "../src/config/read-saf-imports-config.ts";
import { analyzeSpaRouter, listGateSpas } from "../src/spa/analyze-router.ts";
import {
  resolveClientsDistDir,
  resolveClientsBuildDir,
} from "../src/spa/paths.ts";
import { measureSpaFromManifest } from "../src/spa/measure-spa.ts";

const root = findMonorepoRoot(process.cwd());
const baselineArg = process.argv.find((a) => a.startsWith("--baseline="))?.slice(
  "--baseline=".length,
);
const baselinePath = baselineArg
  ? path.resolve(baselineArg)
  : readRootSafImportsConfig(root).snapshot?.baselineBundlesPath
    ? path.join(root, readRootSafImportsConfig(root).snapshot!.baselineBundlesPath!)
    : undefined;

if (!baselinePath) {
  console.error(
    "Pass --baseline=<path> or set safImports.snapshot.baselineBundlesPath in root package.json",
  );
  process.exit(1);
}

const distDir = resolveClientsDistDir(root);
if (!distDir) {
  console.error("No safImports.snapshot.bundles.buildWorkspace configured");
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const buildWorkspace =
  readRootSafImportsConfig(root).snapshot?.bundles?.buildWorkspace;

const spas = {};
for (const spa of listGateSpas(root)) {
  const catalog = analyzeSpaRouter(root, spa);
  if (!catalog) continue;
  const m = measureSpaFromManifest(root, spa, catalog, distDir);
  if (!m) continue;
  spas[spa] = {
    shellJsGzipBytes: m.shell.shellJsGzipBytes,
    shellCssGzipBytes: m.shell.shellCssGzipBytes,
    routes: m.routes.map((r) => ({
      routeKey: r.routeKey,
      pathPattern: r.pathPattern,
      pageChunksGzipBytes: r.pageChunksGzipBytes,
    })),
  };
  console.log(`  ${spa}: shell gzip ${m.shell.shellJsGzipBytes}`);
}

const buildDir = resolveClientsBuildDir(root);
baseline.bundles = {
  status: "ok",
  note: "SPA bundle regression baseline",
  command: buildWorkspace
    ? `npm run build --workspace=${buildWorkspace}`
    : undefined,
  spas,
  preSideEffects: baseline.bundles?.preSideEffects,
};

fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n", "utf8");
console.log(`Updated ${baselinePath}`);
