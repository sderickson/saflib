import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  buildMonorepoContext,
  type MonorepoContext,
  type PackageJson,
} from "@saflib/dev-tools";
import { readPackageSafImportsConfig } from "../config/read-saf-imports-config.ts";
import { resolveTsconfigEntry } from "./resolve-entry.ts";

/** Known meta packages that are not compilable TypeScript units. */
const META_PACKAGE_NAMES = new Set(["@saflib/saflib"]);

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
  /** Meta / root / fixture / gitignored packages skipped from the graph. */
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

/** Published npm artifact under a package's `dist/` (e.g. `saflib/workflows/dist`). */
function isPublishedDistPackage(packageDir: string): boolean {
  if (path.basename(packageDir) !== "dist") return false;
  return fs.existsSync(path.join(packageDir, "..", "package.json"));
}

/**
 * Workspace members that exist on disk but are gitignored (e.g. saflib's
 * product-init `deploy/`) are absent in CI. Skip them so local generate/check
 * matches a clean checkout.
 */
export function isGitIgnoredPackageDirectory(packageDir: string): boolean {
  const result = spawnSync("git", ["check-ignore", "-q", "."], {
    cwd: packageDir,
    encoding: "utf8",
  });
  return result.status === 0;
}

function isUnderDir(dir: string, parentDir: string): boolean {
  const rel = path.relative(parentDir, dir);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Collect workspace package names listed in `dependencies` only.
 * Dev dependencies (test harnesses, vitest, playwright, etc.) are omitted —
 * they are not installed in production Docker builds and must not become
 * composite project references.
 */
export function workspaceDepsOf(
  pj: PackageJson,
  packages: Set<string>,
): string[] {
  const names = new Set<string>();
  for (const dep of Object.keys(pj.dependencies ?? {})) {
    if (packages.has(dep)) names.add(dep);
  }
  return [...names].sort();
}

/**
 * Build a package-level TypeScript project-reference graph from workspace
 * `dependencies`. Only packages with a typecheckable `tsconfig.json` become
 * nodes; edges to packages without a tsconfig are dropped.
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
    if (
      isMetaPackage(name, pj) ||
      isFixturePackage(dir, context.rootDir) ||
      isPublishedDistPackage(dir) ||
      isGitIgnoredPackageDirectory(dir)
    ) {
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

  applyCompositionRootReferences(graph, context.rootDir);

  return {
    rootDir: context.rootDir,
    context,
    graph,
    missingTsconfig,
    skippedMeta,
  };
}

/**
 * Packages may declare `safImports.compositionRoot` in `package.json` to union
 * additional project references beyond workspace dependencies (e.g. a monolith
 * composition root that must reference every sibling service package).
 */
export function applyCompositionRootReferences(
  graph: ReferenceGraph,
  rootDir: string,
): void {
  for (const node of graph.values()) {
    const config = readPackageSafImportsConfig(node.dir).compositionRoot;
    if (!config) continue;

    const extra: string[] = [];

    if (config.includeSiblingPackages) {
      const parentDir = path.dirname(node.dir);
      for (const candidate of graph.values()) {
        if (candidate.name === node.name) continue;
        if (path.dirname(candidate.dir) === parentDir) {
          extra.push(candidate.name);
        }
      }
    }

    if (config.includePackagesUnder) {
      const underRoot = path.join(rootDir, config.includePackagesUnder);
      for (const candidate of graph.values()) {
        if (candidate.name === node.name) continue;
        if (isUnderDir(candidate.dir, underRoot)) {
          extra.push(candidate.name);
        }
      }
    }

    if (extra.length === 0) continue;
    node.references = [...new Set([...node.references, ...extra])].sort();
  }
}
