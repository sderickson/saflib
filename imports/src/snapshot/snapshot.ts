import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildPackageIndex,
  existsResolve,
  findMonorepoRoot,
  resolvePackageExportPath,
} from "../resolve/index.ts";
import type { PackageInfo } from "../types.ts";
import { measureGraph } from "../graph/walk-graph.ts";
import { readRootSafImportsConfig } from "../config/read-saf-imports-config.ts";
import { analyzeSpaRouter, listGateSpas } from "../spa/analyze-router.ts";
import { measureSpaFromManifest } from "../spa/measure-spa.ts";

/** Per-entry graph measurement stored in a metrics snapshot. */
export interface SnapshotGraphStats {
  modules: number;
  lines: number;
  ext: number;
}

/** Suite wall / collect timings. */
export interface SnapshotSuiteTiming {
  wallMs: number;
  collectCpuMs?: number;
}

/** Serial workspace typecheck timing. */
export interface SnapshotTypecheck {
  serialWorkspacesWallMs: number;
  /** Warm 2nd-run wall time for root `npm run typecheck` (`vue-tsc -b`). */
  rootBuildWallMs?: number;
  /** Warm 2nd-run wall time for a single-package pilot (repo `safImports.snapshot.warmTypecheckPackageDir`). */
  warmSinglePackageWallMs?: number;
  warmSinglePackage?: string;
  peakRssMb?: number;
  status?: "ok" | "failed" | "skipped";
  reason?: string;
}

/** Per-route SPA bundle snapshot. */
export interface SpaRouteSnapshot {
  routeKey: string;
  pathPattern: string;
  pageChunksGzipBytes: number;
}

/** SPA shell + route page-chunk snapshot. */
export interface SpaBundleSnapshot {
  shellJsGzipBytes: number;
  shellCssGzipBytes?: number;
  routes: SpaRouteSnapshot[];
}

/** Frontend bundle snapshot — measured or blocked. */
export interface SnapshotBundles {
  status: "ok" | "blocked" | "skipped";
  reason?: string;
  fallback?: string;
  command?: string;
  note?: string;
  chunks?: { chunkName: string; bytes: number; gzipBytes?: number }[];
  spas?: Record<string, SpaBundleSnapshot>;
  preSideEffects?: {
    note?: string;
    spas?: Record<string, SpaBundleSnapshot>;
  };
}

/** Committed metrics snapshot shape. */
export interface MetricsSnapshot {
  generatedAt: string;
  repo: string;
  testFileCount: number;
  tests: Record<string, SnapshotGraphStats>;
  entries: Record<string, SnapshotGraphStats>;
  suites: Record<string, SnapshotSuiteTiming>;
  typecheck: SnapshotTypecheck;
  bundles: SnapshotBundles;
}

export interface GenerateSnapshotOptions {
  /** Monorepo root; auto-detected from cwd when omitted. */
  root?: string;
  /** Absolute path to write the snapshot JSON. */
  outPath: string;
  /** Skip suite / typecheck shell timings. */
  skipTimings?: boolean;
  /** Skip frontend bundle measurement. */
  skipBundles?: boolean;
  /** Progress callback (e.g. CLI logging). */
  onProgress?: (msg: string) => void;
}

export interface CheckSnapshotOptions {
  /** Path to committed snapshot JSON. */
  againstPath: string;
  /** Monorepo root; auto-detected from cwd when omitted. */
  root?: string;
  /** Module-count regression threshold (default 0.05 = 5%). */
  moduleThreshold?: number;
  /** Timing regression threshold (default 0.10 = 10%). */
  timingThreshold?: number;
  /** `error` exits non-zero on regressions (shell/route timing warn-only for routes). */
  mode?: "warn" | "error";
  onProgress?: (msg: string) => void;
}

export interface SnapshotRegression {
  kind: "modules" | "ext" | "timing" | "missing" | "new";
  path: string;
  prior?: number;
  current?: number;
  deltaPct?: number;
}

export interface CheckSnapshotResult {
  regressions: SnapshotRegression[];
  current: MetricsSnapshot;
  reference: MetricsSnapshot;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "fixtures",
]);

function listTestFiles(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
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

function toPosixRel(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join("/");
}

function resolveExportFile(pkg: PackageInfo, exportPath: string): string | null {
  const subpath =
    exportPath === "." || exportPath === ""
      ? ""
      : exportPath.replace(/^\.\//, "");
  const target = resolvePackageExportPath(pkg, subpath);
  if (!target) return null;
  return existsResolve(target);
}

function readRepoName(root: string): string {
  try {
    const pj = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ) as { name?: string };
    return pj.name ?? path.basename(root);
  } catch {
    return path.basename(root);
  }
}

function measureAllTests(
  root: string,
  onProgress?: (msg: string) => void,
): Record<string, SnapshotGraphStats> {
  const files = listTestFiles(root).sort();
  const tests: Record<string, SnapshotGraphStats> = {};
  const total = files.length;
  onProgress?.(`Measuring ${total} test file(s)…`);

  for (let i = 0; i < files.length; i++) {
    const abs = files[i]!;
    const rel = toPosixRel(root, abs);
    const result = measureGraph(abs, { root });
    tests[rel] = {
      modules: result.modules,
      lines: result.lines,
      ext: result.ext,
    };
    if ((i + 1) % 50 === 0 || i + 1 === total) {
      onProgress?.(`  ${i + 1}/${total} test files`);
    }
  }
  return tests;
}

function measureEntryProbes(
  root: string,
  onProgress?: (msg: string) => void,
): Record<string, SnapshotGraphStats> {
  const index = buildPackageIndex(root);
  const entries: Record<string, SnapshotGraphStats> = {};
  onProgress?.("Measuring entry-point probes…");

  const probes = readRootSafImportsConfig(root).snapshot?.entryProbes ?? [];
  if (probes.length === 0) {
    onProgress?.("  skip entry probes (no safImports.snapshot.entryProbes in root package.json)");
    return entries;
  }

  for (const probe of probes) {
    const pkg = index.get(probe.packageName);
    if (!pkg) {
      onProgress?.(`  skip ${probe.label} (package not found)`);
      continue;
    }
    const file = resolveExportFile(pkg, probe.exportPath);
    if (!file || !fs.existsSync(file)) {
      onProgress?.(`  skip ${probe.label} (export file missing)`);
      continue;
    }
    const result = measureGraph(file, { root });
    entries[probe.label] = {
      modules: result.modules,
      lines: result.lines,
      ext: result.ext,
    };
    onProgress?.(
      `  ${probe.label}: modules=${result.modules} lines=${result.lines} ext=${result.ext}`,
    );
  }
  return entries;
}

function parseVitestDuration(output: string): SnapshotSuiteTiming | null {
  // Duration  25.80s (transform …, collect 66.90s, …)
  const wallMatch = output.match(/Duration\s+([\d.]+)\s*s/i);
  if (!wallMatch) return null;
  const wallMs = Math.round(parseFloat(wallMatch[1]!) * 1000);
  const collectMatch = output.match(/collect\s+([\d.]+)\s*s/i);
  const collectCpuMs = collectMatch
    ? Math.round(parseFloat(collectMatch[1]!) * 1000)
    : undefined;
  return { wallMs, collectCpuMs };
}

function runTimedCommand(
  command: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): { wallMs: number; stdout: string; stderr: string; status: number | null; peakRssMb?: number } {
  const start = Date.now();
  const isDarwin = process.platform === "darwin";
  const useTime = isDarwin && fs.existsSync("/usr/bin/time");

  let result;
  if (useTime) {
    result = spawnSync("/usr/bin/time", ["-l", command, ...args], {
      cwd,
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      shell: false,
    });
  } else {
    result = spawnSync(command, args, {
      cwd,
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      shell: false,
    });
  }

  const wallMs = Date.now() - start;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  let peakRssMb: number | undefined;
  if (useTime) {
    // macOS time -l: "…  maximum resident set size"
    const rssMatch = stderr.match(/^\s*(\d+)\s+maximum resident set size/m);
    if (rssMatch) {
      // Darwin reports bytes
      peakRssMb = Math.round(parseInt(rssMatch[1]!, 10) / (1024 * 1024));
    }
  }
  return {
    wallMs,
    stdout,
    stderr,
    status: result.status,
    peakRssMb,
  };
}

function measureSuites(
  root: string,
  onProgress?: (msg: string) => void,
): Record<string, SnapshotSuiteTiming> {
  const suites: Record<string, SnapshotSuiteTiming> = {};
  const targets = readRootSafImportsConfig(root).snapshot?.suites ?? [];
  if (targets.length === 0) {
    onProgress?.("  skip suite timings (no safImports.snapshot.suites in root package.json)");
    return suites;
  }

  for (const target of targets) {
    const packageDir = path.join(root, target.packageDir);
    if (!fs.existsSync(path.join(packageDir, "package.json"))) {
      onProgress?.(`  skip ${target.key} (package not found)`);
      continue;
    }

    onProgress?.(`Timing ${target.key}…`);
    const result = target.vitestPattern
      ? runTimedCommand(
          "npx",
          ["vitest", "run", "--", target.vitestPattern],
          packageDir,
        )
      : runTimedCommand("npm", ["run", "test"], packageDir);
    const parsed = parseVitestDuration(result.stdout + "\n" + result.stderr);
    suites[target.key] = parsed ?? { wallMs: result.wallMs };
    onProgress?.(`  ${target.key} wallMs=${suites[target.key]!.wallMs}`);
  }

  return suites;
}

function measureTypecheck(
  root: string,
  onProgress?: (msg: string) => void,
): SnapshotTypecheck {
  onProgress?.("Timing serial workspace typecheck…");
  const serial = runTimedCommand(
    "npm",
    ["run", "typecheck", "--workspaces", "--if-present"],
    root,
  );
  if (serial.status !== 0 && serial.status !== null) {
    onProgress?.(
      `  serial typecheck exited ${serial.status}; recording wall time anyway`,
    );
  }

  const typecheck: SnapshotTypecheck = {
    serialWorkspacesWallMs: serial.wallMs,
    status: serial.status === 0 ? "ok" : "failed",
  };
  if (serial.status !== 0) {
    typecheck.reason = `serial typecheck exit ${serial.status}`;
  }
  onProgress?.(`  serial typecheck wallMs=${typecheck.serialWorkspacesWallMs}`);

  onProgress?.("Timing warm root project-reference build (vue-tsc -b)…");
  const rootWarmup = runTimedCommand("npm", ["run", "typecheck"], root, {
    NODE_OPTIONS: "--max-old-space-size=8192",
  });
  if (rootWarmup.status !== 0 && rootWarmup.status !== null) {
    onProgress?.(`  root warmup exited ${rootWarmup.status}`);
  }
  const rootWarm = runTimedCommand("npm", ["run", "typecheck"], root, {
    NODE_OPTIONS: "--max-old-space-size=8192",
  });
  typecheck.rootBuildWallMs = rootWarm.wallMs;
  typecheck.peakRssMb = rootWarm.peakRssMb;
  if (rootWarm.status !== 0) {
    typecheck.status = "failed";
    typecheck.reason = `root typecheck exit ${rootWarm.status}`;
  } else {
    typecheck.status = "ok";
    delete typecheck.reason;
  }
  onProgress?.(
    `  root warm wallMs=${typecheck.rootBuildWallMs}` +
      (typecheck.peakRssMb != null ? ` peakRssMb=${typecheck.peakRssMb}` : ""),
  );

  const warmPackageDir = readRootSafImportsConfig(root).snapshot
    ?.warmTypecheckPackageDir;
  if (warmPackageDir) {
    const packageDir = path.join(root, warmPackageDir);
    if (fs.existsSync(path.join(packageDir, "package.json"))) {
      onProgress?.(`Timing warm single-package typecheck (${warmPackageDir})…`);
      const warmup = runTimedCommand("npm", ["run", "typecheck"], packageDir);
      if (warmup.status !== 0 && warmup.status !== null) {
        onProgress?.(`  warmup exited ${warmup.status}`);
      }
      const warm = runTimedCommand("npm", ["run", "typecheck"], packageDir);
      typecheck.warmSinglePackage = warmPackageDir;
      typecheck.warmSinglePackageWallMs = warm.wallMs;
      onProgress?.(`  warm wallMs=${typecheck.warmSinglePackageWallMs}`);
    }
  }

  return typecheck;
}

function listDistAssets(dir: string): { chunkName: string; bytes: number }[] {
  const chunks: { chunkName: string; bytes: number }[] = [];
  if (!fs.existsSync(dir)) return chunks;
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && /\.(js|css|html)$/.test(e.name)) {
        chunks.push({
          chunkName: toPosixRel(dir, full),
          bytes: fs.statSync(full).size,
        });
      }
    }
  };
  walk(dir);
  return chunks.sort((a, b) => a.chunkName.localeCompare(b.chunkName));
}
function loadEnvDev(root: string): Record<string, string> {
  const envPath = path.join(root, "daemon/dev/env.dev");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function spaMeasureToSnapshot(
  results: Record<string, Awaited<ReturnType<typeof measureSpaFromManifest>> | undefined>,
): Record<string, SpaBundleSnapshot> {
  const spas: Record<string, SpaBundleSnapshot> = {};
  for (const [spa, m] of Object.entries(results)) {
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
  }
  return spas;
}

function measureSpaBundles(
  root: string,
  onProgress?: (msg: string) => void,
): Record<string, SpaBundleSnapshot> | undefined {
  const distDir = path.join(root, "daemon/clients/build/dist");
  if (!fs.existsSync(path.join(distDir, ".vite", "manifest.json"))) {
    onProgress?.("  spa measure skipped (no vite manifest — run client build)");
    return undefined;
  }
  const results: Record<string, ReturnType<typeof measureSpaFromManifest>> = {};
  for (const spa of listGateSpas()) {
    const catalog = analyzeSpaRouter(root, spa);
    if (!catalog) continue;
    results[spa] = measureSpaFromManifest(root, spa, catalog, distDir);
    if (results[spa]) {
      onProgress?.(
        `  spa ${spa}: shell gzip ${results[spa]!.shell.shellJsGzipBytes} (${results[spa]!.routes.length} routes)`,
      );
    }
  }
  return spaMeasureToSnapshot(results);
}

function measureBundles(
  root: string,
  onProgress?: (msg: string) => void,
): SnapshotBundles {
  const bundleConfig = readRootSafImportsConfig(root).snapshot?.bundles;
  if (!bundleConfig) {
    onProgress?.("  skip bundle snapshot (no safImports.snapshot.bundles in root package.json)");
    return {
      status: "skipped",
      reason: "no safImports.snapshot.bundles configured",
    };
  }

  const command = `npm run build --workspace=${bundleConfig.buildWorkspace}`;
  onProgress?.("Attempting multi-SPA bundle snapshot…");
  onProgress?.(`  ${command}`);

  const buildDir = path.join(root, bundleConfig.buildWorkspace);
  if (!fs.existsSync(path.join(buildDir, "package.json"))) {
    return {
      status: "blocked",
      reason: `${bundleConfig.buildWorkspace} package not found`,
      fallback: bundleConfig.singleSpaFallback,
      command,
    };
  }

  const result = spawnSync(
    "npm",
    ["run", "build", "--workspace", bundleConfig.buildWorkspace],
    {
      cwd: root,
      env: {
        ...process.env,
        ...loadEnvDev(root),
        NODE_OPTIONS: "--experimental-strip-types",
      },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const candidateDists = [
    path.join(buildDir, "dist"),
    path.join(root, bundleConfig.buildWorkspace, "dist"),
    path.join(root, "dist"),
  ];
  let chunks: { chunkName: string; bytes: number }[] = [];
  for (const d of candidateDists) {
    chunks = listDistAssets(d);
    if (chunks.length > 0) break;
  }

  const jsChunks = chunks.filter((c) => c.chunkName.endsWith(".js"));
  if (result.status === 0 && jsChunks.length >= 2) {
    onProgress?.(`  ok: ${chunks.length} asset(s), ${jsChunks.length} JS chunk(s)`);
    const spas = measureSpaBundles(root, onProgress);
    return {
      status: "ok",
      command,
      chunks,
      spas,
      note: "post-sideEffects regression snapshot",
    };
  }

  const reasonParts: string[] = [];
  if (result.status !== 0) {
    reasonParts.push(`build exited ${result.status}`);
  }
  if (jsChunks.length < 2) {
    reasonParts.push(
      `only ${jsChunks.length} JS chunk(s) emitted (multi-SPA build incomplete without full env)`,
    );
  }
  const errSnippet = combined
    .split("\n")
    .filter((l) => /error|Error|ERR!/i.test(l))
    .slice(0, 5)
    .join("; ");
  if (errSnippet) reasonParts.push(errSnippet);

  let fallbackChunks: { chunkName: string; bytes: number }[] | undefined;
  if (bundleConfig.singleSpaFallback) {
    const fallbackPkg = path.join(root, bundleConfig.singleSpaFallback, "package.json");
    const fallbackDir = path.join(root, bundleConfig.singleSpaFallback);
    const fallbackDist = path.join(fallbackDir, "dist");
    if (fs.existsSync(fallbackPkg)) {
      onProgress?.(`  trying single-SPA fallback (${bundleConfig.singleSpaFallback})…`);
      const fe = spawnSync("npm", ["run", "build"], {
        cwd: fallbackDir,
        env: {
          ...process.env,
          NODE_OPTIONS: "--experimental-strip-types",
        },
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
      if (fe.status === 0) {
        fallbackChunks = listDistAssets(fallbackDist);
        if (fallbackChunks.length === 0) {
          fallbackChunks = listDistAssets(fallbackDir).filter((c) =>
            c.chunkName.includes("dist/"),
          );
        }
      }
    }
  }

  const bundles: SnapshotBundles = {
    status: "blocked",
    reason: reasonParts.join(" — ") || "multi-SPA build did not emit SPA chunks",
    fallback: bundleConfig.singleSpaFallback,
    command,
  };
  if (fallbackChunks && fallbackChunks.length > 0) {
    bundles.chunks = fallbackChunks.map((c) => ({
      ...c,
      chunkName: `${path.basename(bundleConfig.singleSpaFallback ?? "fallback")}/${c.chunkName}`,
    }));
    onProgress?.(
      `  blocked multi-SPA; recorded ${fallbackChunks.length} fallback asset(s)`,
    );
  } else {
    onProgress?.(`  blocked: ${bundles.reason}`);
  }
  return bundles;
}

/**
 * Generate a metrics snapshot: all `*.test.ts` graphs, entry probes,
 * optional suite/typecheck timings, and best-effort bundle sizes.
 */
export function generateSnapshot(
  options: GenerateSnapshotOptions,
): MetricsSnapshot {
  const root = options.root ?? findMonorepoRoot(process.cwd());
  const onProgress = options.onProgress;
  const cpus = os.availableParallelism?.() ?? os.cpus().length;
  onProgress?.(
    `Metrics snapshot generate root=${root} (cpus=${cpus}; measuring serially)`,
  );

  const tests = measureAllTests(root, onProgress);
  const entries = measureEntryProbes(root, onProgress);

  let suites: Record<string, SnapshotSuiteTiming> = {};
  let typecheck: SnapshotTypecheck = {
    serialWorkspacesWallMs: 0,
    status: "skipped",
    reason: "skipped via --skip-timings",
  };
  if (!options.skipTimings) {
    suites = measureSuites(root, onProgress);
    typecheck = measureTypecheck(root, onProgress);
  }

  const bundles: SnapshotBundles = options.skipBundles
    ? { status: "skipped", reason: "skipped via --skip-bundles" }
    : measureBundles(root, onProgress);

  const snapshot: MetricsSnapshot = {
    generatedAt: new Date().toISOString(),
    repo: readRepoName(root),
    testFileCount: Object.keys(tests).length,
    tests,
    entries,
    suites,
    typecheck,
    bundles,
  };

  const outAbs = path.resolve(options.outPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  onProgress?.(
    `Wrote ${snapshot.testFileCount} test(s) + ${Object.keys(entries).length} entr(y/ies) → ${outAbs}`,
  );
  return snapshot;
}

function loadSnapshot(againstPath: string): MetricsSnapshot {
  const abs = path.resolve(againstPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Snapshot file not found: ${abs}`);
  }
  return JSON.parse(fs.readFileSync(abs, "utf8")) as MetricsSnapshot;
}

/**
 * Re-measure graphs and compare to a committed snapshot.
 * Reports regressions; caller exits 0 in M0 (report-only).
 */
export function checkSnapshot(options: CheckSnapshotOptions): CheckSnapshotResult {
  const root = options.root ?? findMonorepoRoot(process.cwd());
  const moduleThreshold = options.moduleThreshold ?? 0.05;
  const timingThreshold = options.timingThreshold ?? 0.1;
  const reference = loadSnapshot(options.againstPath);

  // Diff focuses on graph counts (fast). Timings compared only if present in
  // both snapshots after a fresh generate of graph portions.
  options.onProgress?.("Re-measuring test files for diff…");
  const tests = measureAllTests(root, options.onProgress);
  const entries = measureEntryProbes(root, options.onProgress);

  const current: MetricsSnapshot = {
    generatedAt: new Date().toISOString(),
    repo: readRepoName(root),
    testFileCount: Object.keys(tests).length,
    tests,
    entries,
    suites: {},
    typecheck: { serialWorkspacesWallMs: 0, status: "skipped", reason: "diff skips timings" },
    bundles: { status: "skipped", reason: "diff skips bundles" },
  };

  const regressions: SnapshotRegression[] = [];

  const compareGraph = (
    label: string,
    base: SnapshotGraphStats | undefined,
    cur: SnapshotGraphStats | undefined,
  ) => {
    if (!base && cur) {
      regressions.push({ kind: "new", path: label, current: cur.modules });
      return;
    }
    if (base && !cur) {
      regressions.push({ kind: "missing", path: label, prior: base.modules });
      return;
    }
    if (!base || !cur) return;
    if (base.modules > 0) {
      const delta = (cur.modules - base.modules) / base.modules;
      if (delta > moduleThreshold) {
        regressions.push({
          kind: "modules",
          path: label,
          prior: base.modules,
          current: cur.modules,
          deltaPct: Math.round(delta * 1000) / 10,
        });
      }
    }
    if (base.ext > 0) {
      const delta = (cur.ext - base.ext) / base.ext;
      if (delta > moduleThreshold) {
        regressions.push({
          kind: "ext",
          path: label,
          prior: base.ext,
          current: cur.ext,
          deltaPct: Math.round(delta * 1000) / 10,
        });
      }
    }
  };

  for (const [rel, base] of Object.entries(reference.tests)) {
    compareGraph(rel, base, tests[rel]);
  }
  for (const rel of Object.keys(tests)) {
    if (!(rel in reference.tests)) {
      compareGraph(rel, undefined, tests[rel]);
    }
  }
  for (const [label, base] of Object.entries(reference.entries ?? {})) {
    compareGraph(`entry:${label}`, base, entries[label]);
  }

  const bundleThreshold = 0.05;
  const baseSpas = reference.bundles?.spas;
  if (baseSpas && options.onProgress) {
    options.onProgress?.("Comparing SPA shell budgets vs snapshot…");
    const distDir = path.join(root, "daemon/clients/build/dist");
    if (fs.existsSync(path.join(distDir, ".vite", "manifest.json"))) {
      const currentSpas = measureSpaBundles(root, options.onProgress) ?? {};
      for (const [spa, base] of Object.entries(baseSpas)) {
        const cur = currentSpas[spa];
        if (!cur) continue;
        if (base.shellJsGzipBytes > 0) {
          const delta =
            (cur.shellJsGzipBytes - base.shellJsGzipBytes) / base.shellJsGzipBytes;
          if (delta > bundleThreshold) {
            regressions.push({
              kind: "timing",
              path: `bundle:${spa}:shellJsGzipBytes`,
              prior: base.shellJsGzipBytes,
              current: cur.shellJsGzipBytes,
              deltaPct: Math.round(delta * 1000) / 10,
            });
          }
        }
        for (const baseRoute of base.routes) {
          const curRoute = cur.routes.find(
            (r) => r.routeKey === baseRoute.routeKey,
          );
          if (!curRoute) continue;
          if (baseRoute.pageChunksGzipBytes > 0) {
            const delta =
              (curRoute.pageChunksGzipBytes - baseRoute.pageChunksGzipBytes) /
              baseRoute.pageChunksGzipBytes;
            if (delta > 0.1) {
              regressions.push({
                kind: "timing",
                path: `bundle:${spa}:${baseRoute.routeKey}`,
                prior: baseRoute.pageChunksGzipBytes,
                current: curRoute.pageChunksGzipBytes,
                deltaPct: Math.round(delta * 1000) / 10,
              });
            }
          }
        }
      }
    }
  }

  // Timing regressions only when the reference snapshot has suite timings from
  // a full generate; check itself does not re-time (too slow for CI).
  // Compare committed snapshot suite numbers against themselves is a no-op —
  // instead, if current.suites were populated we'd compare. Document that
  // timing gates need a full generate. Still surface typecheck growth when
  // both have numbers from a previous generate stored alongside — skip.

  void timingThreshold;

  return { regressions, current, reference };
}

/** Route page-chunk timing regressions are warn-only even in error mode (M9). */
export function isRoutePageChunkRegression(r: SnapshotRegression): boolean {
  return (
    r.kind === "timing" &&
    r.path.startsWith("bundle:") &&
    !r.path.endsWith(":shellJsGzipBytes")
  );
}

/** Regressions that fail when `snapshot check --mode error`. */
export function isFatalSnapshotRegression(r: SnapshotRegression): boolean {
  return !isRoutePageChunkRegression(r);
}

/** Format a regression line for CLI output. */
export function formatRegression(r: SnapshotRegression): string {
  switch (r.kind) {
    case "modules":
    case "ext":
    case "timing":
      return `${r.kind} ${r.path}: ${r.prior} → ${r.current} (+${r.deltaPct}%)`;
    case "missing":
      return `missing ${r.path} (was ${r.prior})`;
    case "new":
      return `new ${r.path} (modules=${r.current})`;
  }
}
