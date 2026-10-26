/**
 * Package-boundary checks for a workspace monorepo: undeclared workspace
 * imports, relative imports that leave their package, package-level cycles,
 * built-in layer rules from `saf.kind` (`./layers.ts`), and configurable
 * forbidden dependencies (`safImports.boundaries.rules`).
 */
import fs from "node:fs";
import path from "node:path";
import { isPackageKind, PACKAGE_KINDS } from "@saflib/monorepo/package-kind";
import {
  buildMonorepoContext,
  type PackageJson,
} from "@saflib/monorepo/workspace";
import {
  readRootSafImportsConfig,
  type SafImportsBoundaryRule,
} from "../config/read-saf-imports-config.ts";
import { extractImports } from "../graph/extract-imports.ts";
import { readSource } from "../graph/read-source.ts";
import { listGitIgnoredPackageDirectories } from "../tsconfig/build-graph.ts";
import {
  matchesPackageSelector,
  matchesSubpath,
  type PackageForSelector,
} from "./selectors.ts";
import {
  checkIntegrationInternals,
  checkLayerEdge,
  resolveFeature,
  type LayerFinding,
  type LayerPackage,
} from "./layers.ts";

export type BoundaryViolationKind =
  | "undeclared"
  | "relative-escape"
  | "cycle"
  | "forbidden"
  | "missing-tsconfig"
  | "missing-kind"
  | "layer"
  | "unused-dependency";

export interface BoundaryViolation {
  kind: BoundaryViolationKind;
  /** Stable identity used by the baseline file. */
  key: string;
  /** Human-readable one-line description. */
  message: string;
  /** Repo-relative files that exhibit the violation (sorted, may be empty). */
  files: string[];
}

export interface CheckBoundariesOptions {
  /** Monorepo root; auto-detected from cwd when omitted. */
  root?: string;
}

export interface CheckBoundariesResult {
  rootDir: string;
  packagesScanned: number;
  filesScanned: number;
  violations: BoundaryViolation[];
  /** The scanned packages and import edges, for `saf-imports map`. */
  graph: PackageGraph;
}

export interface GraphPackageInfo {
  name: string;
  /** Repo-relative directory. */
  relDir: string;
  kind?: string;
  feature: string;
  core: boolean;
  /** Absolute product root; undefined outside a product. */
  productRoot?: string;
  /** Declared runtime (`dependencies`/peer/optional) and dev dependencies. */
  dependencies: string[];
  devDependencies: string[];
  /** Runtime (non-test, non-tooling) source files and lines. */
  sourceFiles: number;
  sourceLines: number;
  /** Test/tooling source files and lines. */
  testFiles: number;
  testLines: number;
  /** Runtime source files (package-relative path → lines). */
  sourceFileLines: Record<string, number>;
}

export interface PackageGraph {
  packages: GraphPackageInfo[];
  /** One entry per import of a workspace package by a scanned file. */
  edges: Array<{
    from: string;
    to: string;
    subpath: string;
    file: string;
    dev: boolean;
  }>;
}

interface WorkspacePackage extends PackageForSelector {
  pj: PackageJson;
  runtimeDeps: Set<string>;
  allDeps: Set<string>;
}

interface ImportEdge {
  from: string;
  to: string;
  /** Path within `to` (`schemas/Foo`), or `.` for the package root. */
  subpath: string;
  file: string;
  dev: boolean;
}

/** `@scope/pkg/schemas/Foo.ts` → `schemas/Foo`; `@scope/pkg` → `.`. */
export function subpathOfSpecifier(spec: string, packageName: string): string {
  const rest = spec.slice(packageName.length).replace(/^\//, "");
  return rest ? rest.replace(/\.[cm]?[jt]sx?$/, "") : ".";
}

const SOURCE_EXT_RE = /\.(?:[cm]?[jt]sx?|vue)$/;
const YAML_EXT_RE = /\.ya?ml$/;
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  ".vite",
  "playwright-report",
  "test-results",
]);

/**
 * Files that only run in tests or tooling. Their workspace imports may be
 * satisfied by `devDependencies`, and they are left out of the runtime graph.
 */
export const DEFAULT_DEV_FILE_PATTERNS: readonly RegExp[] = [
  /\.(?:test|spec)\.[cm]?[jt]sx?$/,
  /[.-](?:fake|fakes|mock|mocks|fixture|fixtures|test-fixtures)\.[cm]?[jt]sx?$/,
  /(?:^|\/)(?:fake|fakes|mock|mocks|fixture|fixtures|test-utils?)\.[cm]?[jt]sx?$/,
  /(?:^|\/)(?:test|tests|__tests__|e2e|fixtures|mocks|scripts|bin)\//,
  /(?:^|\/)[^/]+\.config\.[cm]?[jt]s$/,
  /\.stories\.[cm]?[jt]sx?$/,
];

export function isDevFile(
  packageRelativePath: string,
  extraPatterns: readonly RegExp[] = [],
): boolean {
  const p = packageRelativePath.split(path.sep).join("/");
  return [...DEFAULT_DEV_FILE_PATTERNS, ...extraPatterns].some((re) =>
    re.test(p),
  );
}

/** `@scope/name/sub` → `@scope/name`; `name/sub` → `name`. */
export function packageNameOfSpecifier(spec: string): string {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

function declaredDeps(pj: PackageJson, fields: string[]): Set<string> {
  const out = new Set<string>();
  for (const field of fields) {
    const deps = (pj as unknown as Record<string, unknown>)[field];
    if (!deps || typeof deps !== "object") continue;
    for (const key of Object.keys(deps)) out.add(packageNameOfSpecifier(key));
  }
  return out;
}

function isUnder(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function listWorkspacePackages(rootDir: string): WorkspacePackage[] {
  const context = buildMonorepoContext(rootDir);
  const candidates = Object.entries(context.monorepoPackageDirectories).filter(
    ([name, dir]) => {
      const pj = context.monorepoPackageJsons[name]!;
      if (pj.workspaces !== undefined) return false;
      const rel = path.relative(rootDir, dir);
      if (rel.split(path.sep).includes("fixtures")) return false;
      if (path.basename(dir) === "dist") return false;
      return true;
    },
  );
  const ignored = listGitIgnoredPackageDirectories(
    rootDir,
    candidates.map(([, dir]) => dir),
  );
  return candidates
    .filter(([, dir]) => !ignored.has(dir))
    .map(([name, dir]) => {
      const pj = context.monorepoPackageJsons[name]!;
      return {
        name,
        dir,
        relDir: path.relative(rootDir, dir).split(path.sep).join("/"),
        kind: (pj as { saf?: { kind?: string } }).saf?.kind,
        pj,
        runtimeDeps: declaredDeps(pj, [
          "dependencies",
          "peerDependencies",
          "optionalDependencies",
        ]),
        allDeps: declaredDeps(pj, [
          "dependencies",
          "devDependencies",
          "peerDependencies",
          "optionalDependencies",
        ]),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Source files owned by `pkg`, stopping at nested package roots. */
function listPackageFiles(
  pkg: WorkspacePackage,
  packageDirs: Set<string>,
): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (packageDirs.has(abs)) continue;
        walk(abs);
      } else if (
        (SOURCE_EXT_RE.test(entry.name) && !entry.name.endsWith(".d.ts")) ||
        YAML_EXT_RE.test(entry.name)
      ) {
        out.push(abs);
      }
    }
  };
  walk(pkg.dir);
  return out.sort();
}

const YAML_REF_RE = /\$ref:\s*["']?([^"'#\s]+)/g;
const YAML_PKG_REF_RE = /pkg:((?:@[^/\s"'#]+\/)?[^/\s"'#]+)/g;

/** Package specifiers named by `extends` in the package's tsconfig*.json files. */
function tsconfigExtends(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!/^tsconfig.*\.json$/.test(entry)) continue;
    const text = fs.readFileSync(path.join(dir, entry), "utf8");
    for (const m of text.matchAll(/"extends"\s*:\s*(\[[^\]]*\]|"[^"]*")/g)) {
      for (const s of m[1]!.matchAll(/"([^"]+)"/g)) {
        if (!s[1]!.startsWith(".")) out.push(s[1]!);
      }
    }
  }
  return out;
}

function relativeSpecifiers(file: string, src: string): string[] {
  if (YAML_EXT_RE.test(file)) {
    return [...src.matchAll(YAML_REF_RE)]
      .map((m) => m[1]!)
      .filter((s) => s.startsWith("."));
  }
  return extractImports(src)
    .map((i) => i.spec)
    .filter((s) => s.startsWith("."));
}

/** `package.json` `imports` entries as [key, target] pairs (conditions flattened). */
function importsMapTargets(pj: PackageJson): Array<[string, string]> {
  const imports = (pj as unknown as { imports?: Record<string, unknown> })
    .imports;
  if (!imports || typeof imports !== "object") return [];
  const out: Array<[string, string]> = [];
  const visit = (key: string, value: unknown) => {
    if (typeof value === "string") out.push([key, value]);
    else if (value && typeof value === "object") {
      for (const nested of Object.values(value)) visit(key, nested);
    }
  };
  for (const [key, value] of Object.entries(imports)) visit(key, value);
  return out;
}

/**
 * Strongly connected components with more than one package (or a self-loop),
 * each sorted by name. Unlike enumerating individual cycles, the result does
 * not depend on traversal order, so baseline keys stay stable as edges change.
 */
export function findPackageCycles(graph: Map<string, Set<string>>): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];

  const visit = (node: string) => {
    indices.set(node, index);
    lowlink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue;
      if (!indices.has(next)) {
        visit(next);
        lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(next)!));
      } else if (onStack.has(next)) {
        lowlink.set(node, Math.min(lowlink.get(node)!, indices.get(next)!));
      }
    }
    if (lowlink.get(node) === indices.get(node)) {
      const component: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      const selfLoop = graph.get(node)?.has(node) ?? false;
      if (component.length > 1 || selfLoop) components.push(component.sort());
    }
  };

  for (const node of [...graph.keys()].sort()) {
    if (!indices.has(node)) visit(node);
  }
  return components.sort((a, b) => a.join(" ").localeCompare(b.join(" ")));
}

/** Shortest path `from` → … → `from` inside one component, for messages. */
function exampleCycle(
  graph: Map<string, Set<string>>,
  component: string[],
): string[] {
  const members = new Set(component);
  const start = component[0]!;
  const previous = new Map<string, string>();
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const next of [...(graph.get(node) ?? [])].sort()) {
      if (!members.has(next)) continue;
      if (next === start) {
        const path = [node];
        while (path[0] !== start) path.unshift(previous.get(path[0]!)!);
        return [...path, start];
      }
      if (!previous.has(next)) {
        previous.set(next, node);
        queue.push(next);
      }
    }
  }
  return [...component, start];
}

function pushGrouped(
  map: Map<string, BoundaryViolation>,
  violation: Omit<BoundaryViolation, "files">,
  file: string | undefined,
) {
  let existing = map.get(violation.key);
  if (!existing) {
    existing = { ...violation, files: [] };
    map.set(violation.key, existing);
  }
  if (file && !existing.files.includes(file)) existing.files.push(file);
}

function ruleApplies(
  rule: SafImportsBoundaryRule,
  from: WorkspacePackage,
  to: WorkspacePackage,
): boolean {
  if (from.name === to.name) return false;
  if (!rule.from.some((s) => matchesPackageSelector(s, from))) return false;
  if (!rule.disallow.some((s) => matchesPackageSelector(s, to))) return false;
  if (rule.allow?.some((s) => matchesPackageSelector(s, to))) return false;
  return true;
}

export function checkBoundaries(
  options: CheckBoundariesOptions = {},
): CheckBoundariesResult {
  const rootDir = options.root
    ? path.resolve(options.root)
    : buildMonorepoContext().rootDir;
  const config = readRootSafImportsConfig(rootDir).boundaries ?? {};
  const extraDevPatterns = (config.devFilePatterns ?? []).map(
    (p) => new RegExp(p),
  );
  const rules = config.rules ?? [];
  const layersEnabled = config.layers !== false;
  const violations = new Map<string, BoundaryViolation>();

  const allPackages = listWorkspacePackages(rootDir);
  const layerPackages = new Map<string, LayerPackage>(
    allPackages.map((p) => [
      p.name,
      {
        name: p.name,
        kind: p.kind,
        dir: p.dir,
        ...resolveFeature(
          p.dir,
          rootDir,
          (p.pj as { saf?: { feature?: unknown } }).saf?.feature,
        ),
      },
    ]),
  );
  const pushLayer = (found: LayerFinding | undefined, file?: string) => {
    if (!found) return;
    pushGrouped(
      violations,
      { kind: "layer", key: found.key, message: found.message },
      file,
    );
  };
  const byName = new Map(allPackages.map((p) => [p.name, p]));
  const packageDirs = new Set(allPackages.map((p) => p.dir));
  const packages = config.scope
    ? allPackages.filter((p) =>
        config.scope!.some((s) => matchesPackageSelector(s, p)),
      )
    : allPackages;
  const scopedNames = new Set(packages.map((p) => p.name));

  const edges: ImportEdge[] = [];
  let filesScanned = 0;
  const fileStats = new Map(
    packages.map((p) => [
      p.name,
      {
        sourceFiles: 0,
        sourceLines: 0,
        testFiles: 0,
        testLines: 0,
        sourceFileLines: {} as Record<string, number>,
      },
    ]),
  );
  /** Workspace packages each package uses outside TS imports (pkg: refs, tsconfig, scripts, imports map). */
  const otherUses = new Map<string, Set<string>>();
  const useOther = (from: string, spec: string) => {
    const name = packageNameOfSpecifier(spec);
    if (name === from || !byName.has(name)) return;
    if (!otherUses.has(from)) otherUses.set(from, new Set());
    otherUses.get(from)!.add(name);
  };

  for (const pkg of packages) {
    const pkgJsonRel = path
      .relative(rootDir, path.join(pkg.dir, "package.json"))
      .split(path.sep)
      .join("/");
    for (const [, target] of importsMapTargets(pkg.pj)) {
      if (!target.startsWith(".")) useOther(pkg.name, target);
    }
    for (const spec of tsconfigExtends(pkg.dir)) useOther(pkg.name, spec);
    const scripts = Object.values(
      (pkg.pj as { scripts?: Record<string, string> }).scripts ?? {},
    ).join("\n");
    for (const dep of pkg.allDeps) {
      const bins = byName.get(dep)?.pj as { bin?: unknown } | undefined;
      const names =
        typeof bins?.bin === "string"
          ? [packageNameOfSpecifier(dep).split("/").pop()!]
          : Object.keys((bins?.bin as Record<string, string>) ?? {});
      if (
        names.some((b) =>
          new RegExp(
            `(^|[\\s/])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`,
            "m",
          ).test(scripts),
        )
      ) {
        useOther(pkg.name, dep);
      }
    }

    for (const [key, target] of importsMapTargets(pkg.pj)) {
      const abs = path.resolve(pkg.dir, target);
      if (isUnder(abs, pkg.dir)) continue;
      pushGrouped(
        violations,
        {
          kind: "relative-escape",
          key: `relative-escape: ${pkgJsonRel}#imports ${key} -> ${target}`,
          message: `${pkg.name} maps import ${key} to ${target}, outside the package`,
        },
        pkgJsonRel,
      );
    }

    const files = listPackageFiles(pkg, packageDirs);
    const hasTypeScript = files.some((f) => /\.(?:tsx?|vue)$/.test(f));
    if (hasTypeScript && !fs.existsSync(path.join(pkg.dir, "tsconfig.json"))) {
      pushGrouped(
        violations,
        {
          kind: "missing-tsconfig",
          key: `missing-tsconfig: ${pkg.name}`,
          message: `${pkg.name} has TypeScript sources but no tsconfig.json, so the root build never typechecks it`,
        },
        undefined,
      );
    }

    if (!isPackageKind(pkg.kind)) {
      pushGrouped(
        violations,
        {
          kind: "missing-kind",
          key: `missing-kind: ${pkg.name}`,
          message:
            pkg.kind === undefined
              ? `${pkg.name} has no saf.kind in package.json (one of ${PACKAGE_KINDS.join(", ")})`
              : `${pkg.name} has unknown saf.kind "${pkg.kind}" (one of ${PACKAGE_KINDS.join(", ")})`,
        },
        undefined,
      );
    }

    for (const file of files) {
      filesScanned += 1;
      const stats = fileStats.get(pkg.name)!;
      const repoRel = path.relative(rootDir, file).split(path.sep).join("/");
      const dev = isDevFile(path.relative(pkg.dir, file), extraDevPatterns);
      const src = YAML_EXT_RE.test(file)
        ? fs.readFileSync(file, "utf8")
        : readSource(file);
      if (!YAML_EXT_RE.test(file)) {
        const lines = src.split("\n").length;
        if (dev) {
          stats.testFiles += 1;
          stats.testLines += lines;
        } else {
          stats.sourceFiles += 1;
          stats.sourceLines += lines;
          stats.sourceFileLines[
            path.relative(pkg.dir, file).split(path.sep).join("/")
          ] = lines;
        }
      }

      for (const spec of relativeSpecifiers(file, src)) {
        const target = path.resolve(path.dirname(file), spec);
        if (
          layersEnabled &&
          !dev &&
          isUnder(target, path.join(pkg.dir, "state"))
        ) {
          pushLayer(
            checkIntegrationInternals(
              layerPackages.get(pkg.name)!,
              path.relative(pkg.dir, file),
              {
                stateFile: path
                  .relative(pkg.dir, target)
                  .split(path.sep)
                  .join("/"),
              },
            ),
            repoRel,
          );
        }
        if (isUnder(target, pkg.dir)) continue;
        const into = path.relative(rootDir, target).split(path.sep).join("/");
        pushGrouped(
          violations,
          {
            kind: "relative-escape",
            key: `relative-escape: ${repoRel} -> ${spec}`,
            message: `${repoRel} imports ${spec} (${into}), outside ${pkg.name}`,
          },
          repoRel,
        );
      }

      if (YAML_EXT_RE.test(file)) {
        for (const m of src.matchAll(YAML_PKG_REF_RE))
          useOther(pkg.name, m[1]!);
        continue;
      }
      for (const { spec } of extractImports(src)) {
        if (spec.startsWith(".") || spec.startsWith("#")) continue;
        const name = packageNameOfSpecifier(spec);
        if (name === pkg.name || !byName.has(name)) continue;
        edges.push({
          from: pkg.name,
          to: name,
          subpath: subpathOfSpecifier(spec, name),
          file: repoRel,
          dev,
        });
      }
    }
  }

  for (const edge of edges) {
    const from = byName.get(edge.from)!;
    const declared = edge.dev ? from.allDeps : from.runtimeDeps;
    if (!declared.has(edge.to)) {
      const where = edge.dev ? "devDependencies" : "dependencies";
      pushGrouped(
        violations,
        {
          kind: "undeclared",
          key: `undeclared: ${edge.from} -> ${edge.to}${edge.dev ? " (dev)" : ""}`,
          message: `${edge.from} imports ${edge.to} but does not list it in ${where}`,
        },
        edge.file,
      );
    }
    if (layersEnabled && !edge.dev && scopedNames.has(edge.to)) {
      const fromLayer = layerPackages.get(edge.from)!;
      const toLayer = layerPackages.get(edge.to)!;
      pushLayer(checkLayerEdge(fromLayer, toLayer, edge.subpath), edge.file);
      pushLayer(
        checkIntegrationInternals(
          fromLayer,
          path.relative(from.relDir, edge.file),
          { packageKind: toLayer.kind, packageName: toLayer.name },
        ),
        edge.file,
      );
    }
    for (const rule of rules) {
      if (!edge.dev || rule.includeDev) {
        const to = byName.get(edge.to)!;
        const subpathMatches =
          !rule.subpaths || matchesSubpath(rule.subpaths, edge.subpath);
        if (subpathMatches && ruleApplies(rule, from, to)) {
          pushGrouped(
            violations,
            {
              kind: "forbidden",
              key: `forbidden(${rule.name}): ${edge.from} -> ${edge.to}`,
              message: `${edge.from} must not import ${edge.to} (${rule.name})`,
            },
            edge.file,
          );
        }
      }
    }
  }

  // Declared runtime deps forbidden by a rule count even before code uses them.
  for (const from of packages) {
    for (const dep of from.runtimeDeps) {
      const to = byName.get(dep);
      if (!to) continue;
      if (layersEnabled && scopedNames.has(to.name)) {
        pushLayer(
          checkLayerEdge(
            layerPackages.get(from.name)!,
            layerPackages.get(to.name)!,
            undefined,
          ),
        );
      }
      for (const rule of rules) {
        // A subpath rule depends on what is imported, not on the declaration.
        if (!rule.subpaths && ruleApplies(rule, from, to)) {
          pushGrouped(
            violations,
            {
              kind: "forbidden",
              key: `forbidden(${rule.name}): ${from.name} -> ${to.name}`,
              message: `${from.name} must not import ${to.name} (${rule.name})`,
            },
            undefined,
          );
        }
      }
    }
  }

  // Declared dependencies between packages of one product that nothing uses,
  // or that only test/tooling files use.
  if (config.unusedDependencies !== false) {
    const runtimeUsed = new Map<string, Set<string>>();
    const anyUsed = new Map<string, Set<string>>();
    const add = (m: Map<string, Set<string>>, from: string, to: string) => {
      if (!m.has(from)) m.set(from, new Set());
      m.get(from)!.add(to);
    };
    for (const e of edges) {
      add(anyUsed, e.from, e.to);
      if (!e.dev) add(runtimeUsed, e.from, e.to);
    }
    for (const [from, tos] of otherUses) {
      for (const to of tos) {
        add(anyUsed, from, to);
        add(runtimeUsed, from, to);
      }
    }
    for (const pkg of packages) {
      const fromLayer = layerPackages.get(pkg.name)!;
      if (!fromLayer.productRoot) continue;
      for (const dep of [...pkg.allDeps].sort()) {
        if (dep === pkg.name || !scopedNames.has(dep)) continue;
        if (layerPackages.get(dep)?.productRoot !== fromLayer.productRoot)
          continue;
        const runtime = pkg.runtimeDeps.has(dep);
        const field = runtime ? "dependencies" : "devDependencies";
        if (!anyUsed.get(pkg.name)?.has(dep)) {
          pushGrouped(
            violations,
            {
              kind: "unused-dependency",
              key: `unused: ${pkg.name} -> ${dep}${runtime ? "" : " (dev)"}`,
              message: `${pkg.name} lists ${dep} in ${field} but never uses it; remove it`,
            },
            undefined,
          );
        } else if (
          runtime &&
          pkg.kind !== "test" && // test packages are all test code
          !runtimeUsed.get(pkg.name)?.has(dep)
        ) {
          pushGrouped(
            violations,
            {
              kind: "unused-dependency",
              key: `dev-only: ${pkg.name} -> ${dep}`,
              message: `${pkg.name} lists ${dep} in dependencies but only test or tooling files use it; move it to devDependencies`,
            },
            undefined,
          );
        }
      }
    }
  }

  const runtimeGraph = new Map<string, Set<string>>();
  for (const pkg of allPackages) {
    runtimeGraph.set(
      pkg.name,
      new Set(
        [...pkg.runtimeDeps].filter((d) => byName.has(d) && d !== pkg.name),
      ),
    );
  }
  for (const edge of edges) {
    if (!edge.dev) runtimeGraph.get(edge.from)!.add(edge.to);
  }
  for (const component of findPackageCycles(runtimeGraph)) {
    if (!component.some((name) => scopedNames.has(name))) continue;
    const example = exampleCycle(runtimeGraph, component).join(" -> ");
    pushGrouped(
      violations,
      {
        kind: "cycle",
        key: `cycle: ${component.join(", ")}`,
        message: `runtime package cycle among ${component.length} package(s), e.g. ${example}`,
      },
      undefined,
    );
  }

  const sorted = [...violations.values()]
    .map((v) => ({ ...v, files: v.files.sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
  const graph: PackageGraph = {
    packages: packages.map((p) => {
      const layer = layerPackages.get(p.name)!;
      return {
        name: p.name,
        relDir: p.relDir,
        kind: p.kind,
        feature: layer.feature,
        core: layer.core,
        productRoot: layer.productRoot,
        dependencies: [...p.runtimeDeps].sort(),
        devDependencies: [...p.allDeps]
          .filter((d) => !p.runtimeDeps.has(d))
          .sort(),
        ...fileStats.get(p.name)!,
      };
    }),
    edges: edges.map(({ from, to, subpath, file, dev }) => ({
      from,
      to,
      subpath,
      file,
      dev,
    })),
  };
  return {
    rootDir,
    graph,
    packagesScanned: packages.length,
    filesScanned,
    violations: sorted,
  };
}
