import fs from "node:fs";
import path from "node:path";
import type { GraphWalkOptions, PackageIndex } from "../types.ts";
import {
  buildPackageIndex,
  resolveSpecifier,
} from "../resolve/index.ts";
import { extractImports } from "./extract-imports.ts";
import { readSource } from "./read-source.ts";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "fixtures",
]);

const SOURCE_EXT = new Set([".ts", ".tsx", ".vue", ".js", ".jsx"]);

export interface DetectCyclesOptions extends GraphWalkOptions {
  /** When set, only consider files belonging to this workspace package. */
  packageName?: string;
}

/** One cycle as an ordered list of absolute file paths (last equals first). */
export type Cycle = string[];

function isSourceFile(name: string): boolean {
  if (name.endsWith(".d.ts")) return false;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(name)) return false;
  const ext = path.extname(name);
  return SOURCE_EXT.has(ext);
}

function listSourceFiles(dir: string, out: string[] = []): string[] {
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
      listSourceFiles(full, out);
    } else if (e.isFile() && isSourceFile(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function filesForScope(
  index: PackageIndex,
  packageName?: string,
): { files: string[]; error?: string } {
  if (packageName) {
    const pkg = index.get(packageName);
    if (!pkg) {
      return {
        files: [],
        error: `Unknown workspace package: ${packageName}`,
      };
    }
    return { files: listSourceFiles(pkg.dir) };
  }
  const files: string[] = [];
  for (const pkg of index.values()) {
    listSourceFiles(pkg.dir, files);
  }
  return { files };
}

function normalizeCycle(cycle: string[]): string {
  // cycle includes repeated start at end; work on unique nodes
  const nodes = cycle.slice(0, -1);
  let minIdx = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i]! < nodes[minIdx]!) minIdx = i;
  }
  const rotated = [
    ...nodes.slice(minIdx),
    ...nodes.slice(0, minIdx),
  ];
  return rotated.join("\0");
}

function findRootContainingPackage(
  fromDir: string,
  packageName?: string,
): string {
  let dir = path.resolve(fromDir);
  let lastWorkspacesRoot: string | null = null;

  for (;;) {
    const pjPath = path.join(dir, "package.json");
    try {
      const pj = JSON.parse(fs.readFileSync(pjPath, "utf8")) as {
        workspaces?: unknown;
      };
      if (pj.workspaces) {
        lastWorkspacesRoot = dir;
        if (!packageName) return dir;
        const index = buildPackageIndex(dir);
        if (index.has(packageName)) return dir;
      }
    } catch {
      // keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (lastWorkspacesRoot) return lastWorkspacesRoot;
  throw new Error(`Could not find monorepo root from ${fromDir}`);
}

/**
 * Detect circular dependencies among first-party modules via DFS back-edges.
 */
export function detectCycles(
  options: DetectCyclesOptions = {},
): { cycles: Cycle[]; error?: string } {
  const includeTypes = options.includeTypes ?? false;
  const root =
    options.root ??
    findRootContainingPackage(process.cwd(), options.packageName);
  const index = buildPackageIndex(root);
  const { files, error } = filesForScope(index, options.packageName);
  if (error) return { cycles: [], error };

  const fileSet = new Set(files);
  const adj = new Map<string, string[]>();

  for (const file of files) {
    let raw: string;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const src = file.endsWith(".vue") ? readSource(file) : raw;
    const deps: string[] = [];
    for (const { spec, isTypeOnly } of extractImports(src)) {
      if (isTypeOnly && !includeTypes) continue;
      const resolved = resolveSpecifier(spec, file, index);
      if (resolved?.kind === "file" && fileSet.has(resolved.path)) {
        deps.push(resolved.path);
      }
    }
    adj.set(file, deps);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const f of files) color.set(f, WHITE);

  const stack: string[] = [];
  const seenKeys = new Set<string>();
  const cycles: Cycle[] = [];

  function dfs(node: string) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        const idx = stack.indexOf(next);
        if (idx >= 0) {
          const cycle = [...stack.slice(idx), next];
          const key = normalizeCycle(cycle);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            cycles.push(cycle);
          }
        }
      } else if (c === WHITE) {
        dfs(next);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const f of files) {
    if (color.get(f) === WHITE) dfs(f);
  }

  return { cycles };
}
