import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildPackageIndex,
  findMonorepoRoot,
} from "../resolve/index.ts";
import { measureGraph } from "../graph/walk-graph.ts";

/** Per-entry graph measurement stored in the baseline snapshot. */
export interface BaselineGraphStats {
  modules: number;
  lines: number;
  ext: number;
}

/** Suite wall / collect timings. */
export interface BaselineSuiteTiming {
  wallMs: number;
  collectCpuMs?: number;
}

/** Serial workspace typecheck timing. */
export interface BaselineTypecheck {
  serialWorkspacesWallMs: number;
  /** Warm 2nd-run wall time for root `npm run typecheck` (`vue-tsc -b`). */
  rootBuildWallMs?: number;
  /** Warm 2nd-run wall time for a single-package pilot (`daemon/service/http`). */
  warmSinglePackageWallMs?: number;
  warmSinglePackage?: string;
  peakRssMb?: number;
  status?: "ok" | "failed" | "skipped";
  reason?: string;
}

/** Frontend bundle baseline — measured or blocked. */
export interface BaselineBundles {
  status: "ok" | "blocked" | "skipped";
  reason?: string;
  fallback?: string;
  command?: string;
  chunks?: { chunkName: string; bytes: number; gzipBytes?: number }[];
}

/** Committed baseline snapshot shape. */
export interface BaselineSnapshot {
  generatedAt: string;
  repo: string;
  testFileCount: number;
  tests: Record<string, BaselineGraphStats>;
  entries: Record<string, BaselineGraphStats>;
  suites: Record<string, BaselineSuiteTiming>;
  typecheck: BaselineTypecheck;
  bundles: BaselineBundles;
}

export interface GenerateBaselineOptions {
  /** Monorepo root; auto-detected from cwd when omitted. */
  root?: string;
  /** Absolute path to write the baseline JSON. */
  outPath: string;
  /** Skip suite / typecheck shell timings. */
  skipTimings?: boolean;
  /** Skip frontend bundle measurement. */
  skipBundles?: boolean;
  /** Progress callback (e.g. CLI logging). */
  onProgress?: (msg: string) => void;
}

export interface DiffBaselineOptions {
  /** Path to committed baseline JSON. */
  baselinePath: string;
  /** Monorepo root; auto-detected from cwd when omitted. */
  root?: string;
  /** Module-count regression threshold (default 0.05 = 5%). */
  moduleThreshold?: number;
  /** Timing regression threshold (default 0.10 = 10%). */
  timingThreshold?: number;
  onProgress?: (msg: string) => void;
}

export interface BaselineRegression {
  kind: "modules" | "ext" | "timing" | "missing" | "new";
  path: string;
  baseline?: number;
  current?: number;
  deltaPct?: number;
}

export interface DiffBaselineResult {
  regressions: BaselineRegression[];
  current: BaselineSnapshot;
  baseline: BaselineSnapshot;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "fixtures",
]);

/** Default entry probes for PathClerk daemon packages (by workspace name). */
const DEFAULT_ENTRY_PROBES: { label: string; packageName: string; exportPath: string }[] =
  [
    {
      label: "@pathclerk/daemon-service-common",
      packageName: "@pathclerk/daemon-service-common",
      exportPath: ".",
    },
    {
      label: "@pathclerk/daemon-clients-common",
      packageName: "@pathclerk/daemon-clients-common",
      exportPath: ".",
    },
    {
      label: "@pathclerk/daemon-sdk/fakes",
      packageName: "@pathclerk/daemon-sdk",
      exportPath: "./fakes",
    },
  ];

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

function resolveExportFile(
  pkgDir: string,
  exportsField: unknown,
  exportPath: string,
): string | null {
  if (!exportsField) {
    const fallback = path.join(pkgDir, "index.ts");
    return fs.existsSync(fallback) ? fallback : null;
  }
  if (typeof exportsField === "string") {
    return exportPath === "." ? path.join(pkgDir, exportsField) : null;
  }
  if (typeof exportsField !== "object" || exportsField === null) return null;
  const key = exportPath === "." ? "." : exportPath.startsWith("./")
    ? exportPath
    : `./${exportPath}`;
  const target = (exportsField as Record<string, unknown>)[key];
  if (typeof target === "string") return path.join(pkgDir, target);
  if (target && typeof target === "object") {
    const cond = target as Record<string, unknown>;
    for (const k of ["import", "default", "node", "require"]) {
      if (typeof cond[k] === "string") return path.join(pkgDir, cond[k] as string);
    }
  }
  return null;
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
): Record<string, BaselineGraphStats> {
  const files = listTestFiles(root).sort();
  const tests: Record<string, BaselineGraphStats> = {};
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
): Record<string, BaselineGraphStats> {
  const index = buildPackageIndex(root);
  const entries: Record<string, BaselineGraphStats> = {};
  onProgress?.("Measuring entry-point probes…");

  for (const probe of DEFAULT_ENTRY_PROBES) {
    const pkg = index.get(probe.packageName);
    if (!pkg) {
      onProgress?.(`  skip ${probe.label} (package not found)`);
      continue;
    }
    const file = resolveExportFile(pkg.dir, pkg.exports, probe.exportPath);
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

function parseVitestDuration(output: string): BaselineSuiteTiming | null {
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
): Record<string, BaselineSuiteTiming> {
  const suites: Record<string, BaselineSuiteTiming> = {};
  const httpDir = path.join(root, "daemon/service/http");
  if (!fs.existsSync(path.join(httpDir, "package.json"))) {
    onProgress?.("  skip daemon/service/http suite (not found)");
    return suites;
  }

  onProgress?.("Timing daemon/service/http full suite…");
  const full = runTimedCommand("npm", ["run", "test"], httpDir);
  const parsed = parseVitestDuration(full.stdout + "\n" + full.stderr);
  suites["daemon/service/http"] = parsed ?? { wallMs: full.wallMs };
  onProgress?.(
    `  daemon/service/http wallMs=${suites["daemon/service/http"]!.wallMs}` +
      (suites["daemon/service/http"]!.collectCpuMs != null
        ? ` collectCpuMs=${suites["daemon/service/http"]!.collectCpuMs}`
        : ""),
  );

  onProgress?.("Timing list-importers.test.ts…");
  const single = runTimedCommand(
    "npx",
    ["vitest", "run", "--", "routes/matters/list-importers"],
    httpDir,
  );
  const singleParsed = parseVitestDuration(single.stdout + "\n" + single.stderr);
  suites["daemon/service/http/routes/matters/list-importers.test.ts"] =
    singleParsed ?? { wallMs: single.wallMs };
  onProgress?.(
    `  list-importers wallMs=${suites["daemon/service/http/routes/matters/list-importers.test.ts"]!.wallMs}`,
  );

  return suites;
}

function measureTypecheck(
  root: string,
  onProgress?: (msg: string) => void,
): BaselineTypecheck {
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

  const typecheck: BaselineTypecheck = {
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

  const httpDir = path.join(root, "daemon/service/http");
  if (fs.existsSync(path.join(httpDir, "package.json"))) {
    onProgress?.("Timing warm single-package typecheck (daemon/service/http)…");
    const httpWarmup = runTimedCommand("npm", ["run", "typecheck"], httpDir);
    if (httpWarmup.status !== 0 && httpWarmup.status !== null) {
      onProgress?.(`  http warmup exited ${httpWarmup.status}`);
    }
    const httpWarm = runTimedCommand("npm", ["run", "typecheck"], httpDir);
    typecheck.warmSinglePackage = "daemon/service/http";
    typecheck.warmSinglePackageWallMs = httpWarm.wallMs;
    onProgress?.(
      `  http warm wallMs=${typecheck.warmSinglePackageWallMs}`,
    );
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

function measureBundles(
  root: string,
  onProgress?: (msg: string) => void,
): BaselineBundles {
  const command =
    "NODE_OPTIONS='--experimental-strip-types' npm run build --workspace=daemon/clients/build";
  onProgress?.("Attempting multi-SPA bundle baseline…");
  onProgress?.(`  ${command}`);

  const buildDir = path.join(root, "daemon/clients/build");
  if (!fs.existsSync(path.join(buildDir, "package.json"))) {
    return {
      status: "blocked",
      reason: "daemon/clients/build package not found",
      fallback: "daemon/clients/form-editor single-SPA",
      command,
    };
  }

  const result = spawnSync(
    "npm",
    ["run", "build", "--workspace=daemon/clients/build"],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_OPTIONS: "--experimental-strip-types",
      },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  // Vite default outDir is often dist under the build package or clients
  const candidateDists = [
    path.join(buildDir, "dist"),
    path.join(root, "daemon/clients/build/dist"),
    path.join(root, "dist"),
  ];
  let chunks: { chunkName: string; bytes: number }[] = [];
  for (const d of candidateDists) {
    chunks = listDistAssets(d);
    if (chunks.length > 0) break;
  }

  // Meaningful multi-SPA build emits more than a bare shell index.html
  const jsChunks = chunks.filter((c) => c.chunkName.endsWith(".js"));
  if (result.status === 0 && jsChunks.length >= 2) {
    onProgress?.(`  ok: ${chunks.length} asset(s), ${jsChunks.length} JS chunk(s)`);
    return { status: "ok", command, chunks };
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

  // Optional form-editor fallback measurement
  const formEditorDist = path.join(root, "daemon/clients/form-editor/dist");
  const formEditorPkg = path.join(root, "daemon/clients/form-editor/package.json");
  let fallbackChunks: { chunkName: string; bytes: number }[] | undefined;
  if (fs.existsSync(formEditorPkg)) {
    onProgress?.("  trying form-editor single-SPA fallback…");
    const fe = spawnSync("npm", ["run", "build"], {
      cwd: path.join(root, "daemon/clients/form-editor"),
      env: {
        ...process.env,
        NODE_OPTIONS: "--experimental-strip-types",
      },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (fe.status === 0) {
      fallbackChunks = listDistAssets(formEditorDist);
      if (fallbackChunks.length === 0) {
        // vite may write elsewhere
        fallbackChunks = listDistAssets(
          path.join(root, "daemon/clients/form-editor"),
        ).filter((c) => c.chunkName.includes("dist/"));
      }
    }
  }

  const bundles: BaselineBundles = {
    status: "blocked",
    reason: reasonParts.join(" — ") || "multi-SPA build did not emit SPA chunks",
    fallback: "daemon/clients/form-editor single-SPA",
    command,
  };
  if (fallbackChunks && fallbackChunks.length > 0) {
    bundles.chunks = fallbackChunks.map((c) => ({
      ...c,
      chunkName: `form-editor/${c.chunkName}`,
    }));
    onProgress?.(
      `  blocked multi-SPA; recorded ${fallbackChunks.length} form-editor asset(s) as fallback`,
    );
  } else {
    onProgress?.(`  blocked: ${bundles.reason}`);
  }
  return bundles;
}

/**
 * Generate a baseline snapshot: all `*.test.ts` graphs, entry probes,
 * optional suite/typecheck timings, and best-effort bundle sizes.
 */
export function generateBaseline(
  options: GenerateBaselineOptions,
): BaselineSnapshot {
  const root = options.root ?? findMonorepoRoot(process.cwd());
  const onProgress = options.onProgress;
  const cpus = os.availableParallelism?.() ?? os.cpus().length;
  onProgress?.(
    `Baseline generate root=${root} (cpus=${cpus}; measuring serially)`,
  );

  const tests = measureAllTests(root, onProgress);
  const entries = measureEntryProbes(root, onProgress);

  let suites: Record<string, BaselineSuiteTiming> = {};
  let typecheck: BaselineTypecheck = {
    serialWorkspacesWallMs: 0,
    status: "skipped",
    reason: "skipped via --skip-timings",
  };
  if (!options.skipTimings) {
    suites = measureSuites(root, onProgress);
    typecheck = measureTypecheck(root, onProgress);
  }

  const bundles: BaselineBundles = options.skipBundles
    ? { status: "skipped", reason: "skipped via --skip-bundles" }
    : measureBundles(root, onProgress);

  const snapshot: BaselineSnapshot = {
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

function loadBaseline(baselinePath: string): BaselineSnapshot {
  const abs = path.resolve(baselinePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Baseline file not found: ${abs}`);
  }
  return JSON.parse(fs.readFileSync(abs, "utf8")) as BaselineSnapshot;
}

/**
 * Re-measure graphs and compare to a committed baseline.
 * Reports regressions; caller exits 0 in M0 (report-only).
 */
export function diffBaseline(options: DiffBaselineOptions): DiffBaselineResult {
  const root = options.root ?? findMonorepoRoot(process.cwd());
  const moduleThreshold = options.moduleThreshold ?? 0.05;
  const timingThreshold = options.timingThreshold ?? 0.1;
  const baseline = loadBaseline(options.baselinePath);

  // Diff focuses on graph counts (fast). Timings compared only if present in
  // both snapshots after a fresh generate of graph portions.
  options.onProgress?.("Re-measuring test files for diff…");
  const tests = measureAllTests(root, options.onProgress);
  const entries = measureEntryProbes(root, options.onProgress);

  const current: BaselineSnapshot = {
    generatedAt: new Date().toISOString(),
    repo: readRepoName(root),
    testFileCount: Object.keys(tests).length,
    tests,
    entries,
    suites: {},
    typecheck: { serialWorkspacesWallMs: 0, status: "skipped", reason: "diff skips timings" },
    bundles: { status: "skipped", reason: "diff skips bundles" },
  };

  const regressions: BaselineRegression[] = [];

  const compareGraph = (
    label: string,
    base: BaselineGraphStats | undefined,
    cur: BaselineGraphStats | undefined,
  ) => {
    if (!base && cur) {
      regressions.push({ kind: "new", path: label, current: cur.modules });
      return;
    }
    if (base && !cur) {
      regressions.push({ kind: "missing", path: label, baseline: base.modules });
      return;
    }
    if (!base || !cur) return;
    if (base.modules > 0) {
      const delta = (cur.modules - base.modules) / base.modules;
      if (delta > moduleThreshold) {
        regressions.push({
          kind: "modules",
          path: label,
          baseline: base.modules,
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
          baseline: base.ext,
          current: cur.ext,
          deltaPct: Math.round(delta * 1000) / 10,
        });
      }
    }
  };

  for (const [rel, base] of Object.entries(baseline.tests)) {
    compareGraph(rel, base, tests[rel]);
  }
  for (const rel of Object.keys(tests)) {
    if (!(rel in baseline.tests)) {
      compareGraph(rel, undefined, tests[rel]);
    }
  }
  for (const [label, base] of Object.entries(baseline.entries ?? {})) {
    compareGraph(`entry:${label}`, base, entries[label]);
  }

  // Timing regressions only when baseline has suite timings and caller re-ran
  // generate with timings; diff itself does not re-time (too slow for CI).
  // Compare committed baseline suite numbers against themselves is a no-op —
  // instead, if current.suites were populated we'd compare. Document that
  // timing gates need a full generate. Still surface baseline typecheck growth
  // when both have numbers from a previous generate stored alongside — skip.

  void timingThreshold;

  return { regressions, current, baseline };
}

/** Format a regression line for CLI output. */
export function formatRegression(r: BaselineRegression): string {
  switch (r.kind) {
    case "modules":
    case "ext":
    case "timing":
      return `${r.kind} ${r.path}: ${r.baseline} → ${r.current} (+${r.deltaPct}%)`;
    case "missing":
      return `missing ${r.path} (was ${r.baseline})`;
    case "new":
      return `new ${r.path} (modules=${r.current})`;
  }
}
