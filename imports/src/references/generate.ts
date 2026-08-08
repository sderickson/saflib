import fs from "node:fs";
import path from "node:path";
import {
  buildReferenceGraph,
  type BuildReferenceGraphResult,
  type ReferenceGraph,
} from "./build-graph.ts";
import { detectReferenceCycles, type ReferenceCycle } from "./detect-cycles.ts";
import {
  mergePackageReferences,
  readReferences,
  readTsconfigJson,
  referencesEqual,
  sortReferences,
  writeTsconfigJson,
  type TsconfigReference,
} from "./tsconfig-io.ts";

export interface PackageReferencePreview {
  package: string;
  tsconfig: string;
  /** Workspace dependency references only (internals merged at write/check time). */
  references: TsconfigReference[];
}

export interface SolutionReferencePreview {
  /** Absolute path to the solution tsconfig. */
  tsconfig: string;
  /** Role label for CLI output. */
  kind: "pathclerk-root" | "saflib-root" | "generic-root";
  references: TsconfigReference[];
}

export interface GenerateReferencesPreview {
  rootDir: string;
  write: boolean;
  writeSupported: true;
  packages: PackageReferencePreview[];
  solutions: SolutionReferencePreview[];
  missingTsconfig: string[];
  skippedMeta: string[];
  written: string[];
  unchanged: string[];
}

export interface ReferenceDrift {
  tsconfig: string;
  expected: TsconfigReference[];
  actual: TsconfigReference[];
}

export interface CheckReferencesResult {
  rootDir: string;
  ok: boolean;
  cycles: ReferenceCycle[];
  drifts: ReferenceDrift[];
}

function relativeReferencePath(fromDir: string, toDir: string): string {
  let rel = path.relative(fromDir, toDir);
  if (!rel.startsWith(".") && !path.isAbsolute(rel)) {
    rel = `./${rel}`;
  }
  // Prefer POSIX-style separators in generated JSON for stable diffs.
  return rel.split(path.sep).join("/");
}

function isUnderDir(dir: string, parentDir: string): boolean {
  const rel = path.relative(parentDir, dir);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Workflow scaffold packages are workspace members but should not appear in
 * solution roots (they're templates, not shipped compilation units).
 */
export function isWorkflowTemplatePackage(
  packageDir: string,
  rootDir: string,
): boolean {
  const rel = path.relative(rootDir, packageDir);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const parts = rel.split(path.sep);
  const workflowsIdx = parts.indexOf("workflows");
  if (workflowsIdx < 0) return false;
  // e.g. workflows/templates, workflows/client-templates, workflows/template/…
  return parts
    .slice(workflowsIdx + 1)
    .some((part) => part.includes("template"));
}

function readRootPackageName(rootDir: string): string | undefined {
  const pjPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(pjPath)) return undefined;
  try {
    const pj = JSON.parse(fs.readFileSync(pjPath, "utf8")) as { name?: string };
    return pj.name;
  } catch {
    return undefined;
  }
}

function findNestedSaflibDir(rootDir: string): string | null {
  const candidate = path.join(rootDir, "saflib");
  const pjPath = path.join(candidate, "package.json");
  if (!fs.existsSync(pjPath)) return null;
  try {
    const pj = JSON.parse(fs.readFileSync(pjPath, "utf8")) as { name?: string };
    return pj.name === "@saflib/saflib" ? candidate : null;
  } catch {
    return null;
  }
}

function packageWorkspaceRefs(
  node: { name: string; dir: string; references: string[] },
  graph: ReferenceGraph,
): TsconfigReference[] {
  return sortReferences(
    node.references.map((depName) => {
      const dep = graph.get(depName)!;
      return { path: relativeReferencePath(node.dir, dep.dir) };
    }),
  );
}

function solutionRefsForPackages(
  fromDir: string,
  packageDirs: string[],
): TsconfigReference[] {
  return sortReferences(
    packageDirs.map((dir) => ({
      path: relativeReferencePath(fromDir, dir),
    })),
  );
}

/**
 * Compute solution-style root configs for the given monorepo scope.
 *
 * - pathclerk root → `{ "./saflib" }` hub + non-saflib leaves; also emits saflib nested solution
 * - saflib root → every saflib leaf
 * - generic fixture → every typecheckable package
 */
export function computeSolutions(
  built: BuildReferenceGraphResult,
): SolutionReferencePreview[] {
  const { rootDir, graph } = built;
  const rootName = readRootPackageName(rootDir);
  const nodes = [...graph.values()].filter(
    (n) => !isWorkflowTemplatePackage(n.dir, rootDir),
  );

  if (rootName === "@saflib/saflib") {
    return [
      {
        tsconfig: path.join(rootDir, "tsconfig.json"),
        kind: "saflib-root",
        references: solutionRefsForPackages(
          rootDir,
          nodes.map((n) => n.dir),
        ),
      },
    ];
  }

  const saflibDir = findNestedSaflibDir(rootDir);
  if (saflibDir) {
    const saflibLeaves = nodes.filter((n) => isUnderDir(n.dir, saflibDir));
    const pathclerkLeaves = nodes.filter((n) => !isUnderDir(n.dir, saflibDir));
    return [
      {
        tsconfig: path.join(rootDir, "tsconfig.json"),
        kind: "pathclerk-root",
        references: sortReferences([
          { path: relativeReferencePath(rootDir, saflibDir) },
          ...solutionRefsForPackages(
            rootDir,
            pathclerkLeaves.map((n) => n.dir),
          ),
        ]),
      },
      {
        tsconfig: path.join(saflibDir, "tsconfig.json"),
        kind: "saflib-root",
        references: solutionRefsForPackages(
          saflibDir,
          saflibLeaves.map((n) => n.dir),
        ),
      },
    ];
  }

  return [
    {
      tsconfig: path.join(rootDir, "tsconfig.json"),
      kind: "generic-root",
      references: solutionRefsForPackages(
        rootDir,
        nodes.map((n) => n.dir),
      ),
    },
  ];
}

function computePackagePreviews(
  built: BuildReferenceGraphResult,
): PackageReferencePreview[] {
  const packages: PackageReferencePreview[] = [];
  for (const node of [...built.graph.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    packages.push({
      package: node.name,
      tsconfig: path.join(node.dir, node.tsconfigEntry),
      references: packageWorkspaceRefs(node, built.graph),
    });
  }
  return packages;
}

function expectedPackageReferences(
  tsconfigPath: string,
  workspaceRefs: TsconfigReference[],
): TsconfigReference[] {
  const packageDir = path.dirname(tsconfigPath);
  const existing = fs.existsSync(tsconfigPath)
    ? readReferences(tsconfigPath)
    : [];
  return mergePackageReferences(packageDir, existing, workspaceRefs);
}

function isSolutionConfig(config: Record<string, unknown>): boolean {
  return (
    Array.isArray(config.files) &&
    config.files.length === 0 &&
    !("extends" in config)
  );
}

function isTypecheckOnlyConfig(tsconfigPath: string): boolean {
  return path.basename(tsconfigPath).includes("typecheck");
}

function emitDefaultsFor(tsconfigPath: string): Record<string, string> {
  const base = path.basename(tsconfigPath);
  if (base === "tsconfig.app.json") {
    return {
      outDir: "./dist/types",
      tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    };
  }
  if (base === "tsconfig.node.json") {
    return {
      outDir: "./dist/types",
      tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    };
  }
  return {
    outDir: "./dist/types",
    tsBuildInfoFile: "./node_modules/.tmp/tsconfig.tsbuildinfo",
  };
}

function isExportedPreset(tsconfigPath: string): boolean {
  return (
    tsconfigPath.endsWith(`${path.sep}tsconfig.base.json`) ||
    tsconfigPath.endsWith(`${path.sep}tsconfig.app.base.json`)
  );
}

/** Ensure per-package emit paths and strip legacy noEmit overrides. */
export function ensurePackageEmitOptions(tsconfigPath: string): boolean {
  if (
    !fs.existsSync(tsconfigPath) ||
    isTypecheckOnlyConfig(tsconfigPath) ||
    isExportedPreset(tsconfigPath)
  ) {
    return false;
  }

  const config = readTsconfigJson(tsconfigPath);
  let changed = false;

  if (isSolutionConfig(config)) {
    const existing = (config.compilerOptions ?? {}) as Record<string, unknown>;
    if (existing.composite !== true) {
      config.compilerOptions = { ...existing, composite: true };
      changed = true;
    }
    if (changed) writeTsconfigJson(tsconfigPath, config);
    return changed;
  }

  const defaults = emitDefaultsFor(tsconfigPath);
  const existing = { ...((config.compilerOptions ?? {}) as Record<string, unknown>) };
  const next = { ...existing };

  for (const [key, value] of Object.entries(defaults)) {
    if (next[key] !== value) {
      next[key] = value;
      changed = true;
    }
  }

  if (next.noEmit !== false) {
    next.noEmit = false;
    changed = true;
  }
  if (next.emitDeclarationOnly !== true && !isSolutionConfig(config)) {
    next.emitDeclarationOnly = true;
    changed = true;
  }

  for (const key of [
    "composite",
    "declaration",
    "declarationMap",
  ] as const) {
    if (next[key] === false) {
      delete next[key];
      changed = true;
    }
  }

  const exclude = Array.isArray(config.exclude) ? [...config.exclude] : [];
  if (exclude.includes("dist")) {
    const withoutDist = exclude.filter((p) => p !== "dist");
    exclude.length = 0;
    exclude.push(...withoutDist);
    changed = true;
  }
  for (const pattern of [
    "node_modules",
    "dist/types",
    "e2e",
    "playwright-report",
    "test-results",
  ]) {
    if (!exclude.includes(pattern)) {
      exclude.push(pattern);
      changed = true;
    }
  }
  if (changed) config.exclude = exclude;

  const base = path.basename(tsconfigPath);
  const extendsMonorepo = JSON.stringify(config.extends ?? "").includes(
    "@saflib/monorepo",
  );
  const extendsVue =
    base === "tsconfig.app.json" ||
    JSON.stringify(config.extends ?? "").includes("@saflib/vue/tsconfig.app");

  if (!isSolutionConfig(config) && (extendsMonorepo || extendsVue)) {
    for (const pattern of [
      "workflows/template/**",
      "workflows/templates/**",
      "**/workflows/template/**",
      "**/workflows/templates/**",
    ]) {
      if (!exclude.includes(pattern)) {
        exclude.push(pattern);
        changed = true;
      }
    }
    if (changed) config.exclude = exclude;
  }

  if (
    !isSolutionConfig(config) &&
    !Array.isArray(config.include) &&
    extendsMonorepo
  ) {
    config.include = ["**/*.ts", "**/*.json"];
    changed = true;
  }
  if (
    !isSolutionConfig(config) &&
    !Array.isArray(config.include) &&
    extendsVue &&
    !extendsMonorepo
  ) {
    config.include = ["**/*.ts", "**/*.tsx", "**/*.vue", "**/*.json"];
    changed = true;
  }

  if (extendsVue) {
    const types = Array.isArray(next.types) ? [...next.types] : [];
    if (!types.includes("vite/client")) {
      next.types = ["vite/client"];
      changed = true;
    }
  }

  if (!changed) return false;
  config.compilerOptions = next;
  writeTsconfigJson(tsconfigPath, config);
  return true;
}

function relatedTsconfigLeaves(packageDir: string): string[] {
  const leaves = ["tsconfig.app.json", "tsconfig.node.json"];
  return leaves
    .map((name) => path.join(packageDir, name))
    .filter((p) => fs.existsSync(p));
}

function patchLeafTsconfigReferences(
  packageDir: string,
  workspaceRefs: TsconfigReference[],
): boolean {
  const appPath = path.join(packageDir, "tsconfig.app.json");
  if (!fs.existsSync(appPath)) return false;

  const config = readTsconfigJson(appPath);
  const existing = (config.references ?? []).map((r) => ({ path: r.path }));
  const next = mergePackageReferences(packageDir, existing, workspaceRefs);
  if (referencesEqual(existing, next)) return false;
  config.references = next;
  writeTsconfigJson(appPath, config);
  return true;
}

function patchPackageTsconfig(
  tsconfigPath: string,
  workspaceRefs: TsconfigReference[],
): boolean {
  if (!fs.existsSync(tsconfigPath)) {
    throw new Error(`Missing tsconfig: ${tsconfigPath}`);
  }
  const packageDir = path.dirname(tsconfigPath);
  const config = readTsconfigJson(tsconfigPath);
  const existing = (config.references ?? []).map((r) => ({ path: r.path }));
  const next = mergePackageReferences(packageDir, existing, workspaceRefs);
  let changed = false;
  if (!referencesEqual(existing, next)) {
    config.references = next;
    writeTsconfigJson(tsconfigPath, config);
    changed = true;
  }
  if (ensurePackageEmitOptions(tsconfigPath)) changed = true;
  for (const leaf of relatedTsconfigLeaves(packageDir)) {
    if (ensurePackageEmitOptions(leaf)) changed = true;
    if (path.basename(leaf) === "tsconfig.app.json") {
      if (patchLeafTsconfigReferences(packageDir, workspaceRefs)) changed = true;
    }
  }
  return changed;
}

function writeSolutionTsconfig(solution: SolutionReferencePreview): boolean {
  const expected = sortReferences(solution.references);
  if (fs.existsSync(solution.tsconfig)) {
    try {
      const existing = readTsconfigJson(solution.tsconfig);
      const isSolutionShape =
        Array.isArray(existing.files) &&
        existing.files.length === 0 &&
        !("extends" in existing) &&
        !("include" in existing);
      const compositeOk =
        !("compilerOptions" in existing) ||
        (existing.compilerOptions as { composite?: boolean } | undefined)
          ?.composite === true;
      if (
        isSolutionShape &&
        compositeOk &&
        referencesEqual(existing.references ?? [], expected)
      ) {
        return false;
      }
    } catch {
      // rewrite malformed / non-JSON configs
    }
  }
  writeTsconfigJson(solution.tsconfig, {
    files: [],
    compilerOptions: { composite: true },
    references: expected,
  });
  return true;
}

/**
 * Preview (and optionally write) project-reference arrays for each package
 * tsconfig plus solution-style root configs.
 */
export function previewReferencesGenerate(options: {
  root?: string;
  write?: boolean;
}): GenerateReferencesPreview {
  const built = buildReferenceGraph(options.root);
  const packages = computePackagePreviews(built);
  const solutions = computeSolutions(built);
  const written: string[] = [];
  const unchanged: string[] = [];

  if (options.write) {
    for (const pkg of packages) {
      if (isWorkflowTemplatePackage(path.dirname(pkg.tsconfig), built.rootDir)) {
        continue;
      }
      const changed = patchPackageTsconfig(pkg.tsconfig, pkg.references);
      (changed ? written : unchanged).push(pkg.tsconfig);
    }
    for (const solution of solutions) {
      const changed = writeSolutionTsconfig(solution);
      (changed ? written : unchanged).push(solution.tsconfig);
    }
  }

  return {
    rootDir: built.rootDir,
    write: Boolean(options.write),
    writeSupported: true,
    packages,
    solutions,
    missingTsconfig: built.missingTsconfig,
    skippedMeta: built.skippedMeta,
    written,
    unchanged,
  };
}

/** Alias used by callers that want an explicit generate entrypoint. */
export function generateReferences(options: {
  root?: string;
  write?: boolean;
}): GenerateReferencesPreview {
  return previewReferencesGenerate(options);
}

/**
 * Diff on-disk tsconfigs against the generator; also fails when the reference
 * graph contains cycles.
 */
export function checkReferences(options: {
  root?: string;
}): CheckReferencesResult {
  const built = buildReferenceGraph(options.root);
  const packages = computePackagePreviews(built);
  const solutions = computeSolutions(built);
  const cycles = detectReferenceCycles(built.graph);
  const drifts: ReferenceDrift[] = [];

  for (const pkg of packages) {
    const packageDir = path.dirname(pkg.tsconfig);
    if (isWorkflowTemplatePackage(packageDir, built.rootDir)) {
      continue;
    }
    const expected = expectedPackageReferences(pkg.tsconfig, pkg.references);
    const actual = fs.existsSync(pkg.tsconfig)
      ? readReferences(pkg.tsconfig)
      : [];
    if (!referencesEqual(expected, actual)) {
      drifts.push({ tsconfig: pkg.tsconfig, expected, actual });
    }
    const appPath = path.join(path.dirname(pkg.tsconfig), "tsconfig.app.json");
    if (fs.existsSync(appPath)) {
      const expectedApp = expectedPackageReferences(appPath, pkg.references);
      const actualApp = readReferences(appPath);
      if (!referencesEqual(expectedApp, actualApp)) {
        drifts.push({ tsconfig: appPath, expected: expectedApp, actual: actualApp });
      }
    }
  }

  for (const solution of solutions) {
    const expected = sortReferences(solution.references);
    let actual: TsconfigReference[] = [];
    let shapeOk = false;
    if (fs.existsSync(solution.tsconfig)) {
      try {
        const config = readTsconfigJson(solution.tsconfig);
        actual = config.references ?? [];
        shapeOk =
          Array.isArray(config.files) &&
          config.files.length === 0 &&
          !("extends" in config) &&
          !("include" in config) &&
          (!("compilerOptions" in config) ||
            (config.compilerOptions as { composite?: boolean } | undefined)
              ?.composite === true);
      } catch {
        shapeOk = false;
      }
    }
    if (!shapeOk || !referencesEqual(expected, actual)) {
      drifts.push({
        tsconfig: solution.tsconfig,
        expected,
        actual,
      });
    }
  }

  return {
    rootDir: built.rootDir,
    ok: cycles.length === 0 && drifts.length === 0,
    cycles,
    drifts,
  };
}
