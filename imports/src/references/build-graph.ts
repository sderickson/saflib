import path from "node:path";
import {
  buildMonorepoContext,
  type MonorepoContext,
  type PackageJson,
} from "@saflib/dev-tools";
import { resolveTsconfigEntry } from "./resolve-entry.ts";

/** Known meta packages that are not compilable TypeScript units. */
const META_PACKAGE_NAMES = new Set([
  "@pathclerk/pathclerk",
  "@saflib/saflib",
]);

/** Composition root: references every typecheckable `daemon/service/*` package. */
export const MONOLITH_PACKAGE_NAME = "@pathclerk/daemon-monolith";

export interface ReferenceGraphNode {
  name: string;
  dir: string;
  /** Entry file relative to `dir` (always `tsconfig.json` today). */
  tsconfigEntry: string;
  /** Workspace package names this package should reference. */
  references: string[];
}

/**
 * Package-level project-reference graph.
 * Keys are workspace package names that participate in typecheck.
 */
export type ReferenceGraph = Map<string, ReferenceGraphNode>;

export interface BuildReferenceGraphResult {
  rootDir: string;
  context: MonorepoContext;
  graph: ReferenceGraph;
  /** Workspace packages skipped because they lack a tsconfig.json. */
  missingTsconfig: string[];
  /** Meta / root packages skipped from the graph. */
  skippedMeta: string[];
}

function isMetaPackage(name: string, pj: PackageJson): boolean {
  if (META_PACKAGE_NAMES.has(name)) return true;
  // Workspace roots (have a workspaces field) are orchestration packages.
  if (pj.workspaces !== undefined) return true;
  return false;
}

/**
 * Test fixtures nested under packages (e.g. `imports/fixtures/…`) are not real
 * workspace units. Detected relative to the monorepo root so a fixture monorepo
 * used as `--root` still participates in its own graph.
 */
function isFixturePackage(packageDir: string, rootDir: string): boolean {
  const rel = path.relative(rootDir, packageDir);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  return rel.split(path.sep).includes("fixtures");
}

/**
 * Collect workspace package names listed in dependencies ∪ devDependencies.
 */
export function workspaceDepsOf(
  pj: PackageJson,
  packages: Set<string>,
): string[] {
  const names = new Set<string>();
  for (const dep of Object.keys(pj.dependencies ?? {})) {
    if (packages.has(dep)) names.add(dep);
  }
  for (const dep of Object.keys(pj.devDependencies ?? {})) {
    if (packages.has(dep)) names.add(dep);
  }
  return [...names].sort();
}

/**
 * Build a package-level TypeScript project-reference graph from workspace
 * `dependencies` + `devDependencies`. Only packages with a typecheckable
 * `tsconfig.json` become nodes; edges to packages without a tsconfig are dropped.
 */
export function buildReferenceGraph(
  root?: string,
): BuildReferenceGraphResult {
  const context = buildMonorepoContext(root);
  const { packages, monorepoPackageJsons, monorepoPackageDirectories } =
    context;

  const missingTsconfig: string[] = [];
  const skippedMeta: string[] = [];
  const typecheckable = new Map<string, string>(); // name → entry

  for (const name of packages) {
    const pj = monorepoPackageJsons[name]!;
    const dir = monorepoPackageDirectories[name]!;
    if (isMetaPackage(name, pj) || isFixturePackage(dir, context.rootDir)) {
      skippedMeta.push(name);
      continue;
    }
    const entry = resolveTsconfigEntry(dir);
    if (!entry) {
      missingTsconfig.push(name);
      continue;
    }
    typecheckable.set(name, entry);
  }

  missingTsconfig.sort();
  skippedMeta.sort();

  const graph: ReferenceGraph = new Map();
  for (const [name, tsconfigEntry] of typecheckable) {
    const pj = monorepoPackageJsons[name]!;
    const dir = monorepoPackageDirectories[name]!;
    const refs = workspaceDepsOf(pj, packages).filter((dep) =>
      typecheckable.has(dep),
    );
    graph.set(name, {
      name,
      dir,
      tsconfigEntry,
      references: refs,
    });
  }

  applyMonolithServiceReferences(graph, context.rootDir);

  return {
    rootDir: context.rootDir,
    context,
    graph,
    missingTsconfig,
    skippedMeta,
  };
}

/**
 * `@pathclerk/daemon-monolith` must reference every typecheckable package under
 * `daemon/service/` (package.json deps alone are incomplete for the composition root).
 */
export function applyMonolithServiceReferences(
  graph: ReferenceGraph,
  rootDir: string,
): void {
  const monolith = graph.get(MONOLITH_PACKAGE_NAME);
  if (!monolith) return;

  const serviceRoot = path.join(rootDir, "daemon/service");
  const servicePackages: string[] = [];
  for (const node of graph.values()) {
    if (node.name === MONOLITH_PACKAGE_NAME) continue;
    const rel = path.relative(serviceRoot, node.dir);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    servicePackages.push(node.name);
  }

  monolith.references = [
    ...new Set([...monolith.references, ...servicePackages]),
  ].sort();
}
