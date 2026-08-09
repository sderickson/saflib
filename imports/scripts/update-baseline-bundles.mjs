#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Patch baseline.json bundles section from current dist manifest + spa measure.
 * Run after: npm run build --workspace=daemon/clients/build (with env.dev)
 */
import fs from "node:fs";
import path from "node:path";
import { findMonorepoRoot } from "../src/resolve/index.ts";
import { analyzeSpaRouter, listGateSpas } from "../src/spa/analyze-router.ts";
import { measureSpaFromManifest } from "../src/spa/measure-spa.ts";

const root = findMonorepoRoot(process.cwd());
const baselinePath = path.join(
  root,
  "daemon/plans/notes/2026-08-07-test-import-graph/baseline.json",
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const distDir = path.join(root, "daemon/clients/build/dist");

const spas = {};
for (const spa of listGateSpas()) {
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

baseline.bundles = {
  status: "ok",
  note: "M8 regression baseline (sideEffects applied)",
  command: "npm run build --workspace=daemon/clients/build",
  spas,
  preSideEffects: baseline.bundles?.preSideEffects ?? {
    note: "approximate pre-sideEffects app shell ~670641 gzip (measured before M8 sideEffects rollout)",
    spas: {
      app: { shellJsGzipBytes: 670641, routes: [] },
    },
  },
};

fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n", "utf8");
console.log(`Updated ${baselinePath}`);
