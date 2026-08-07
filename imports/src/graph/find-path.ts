import fs from "node:fs";
import path from "node:path";
import type {
  FindPathResult,
  GraphWalkOptions,
  PackageIndex,
  ResolveResult,
} from "../types.ts";
import {
  buildPackageIndex,
  existsResolve,
  findMonorepoRoot,
  resolveSpecifier,
} from "../resolve/index.ts";
import { extractImports } from "./extract-imports.ts";
import { readSource } from "./read-source.ts";

interface Hop {
  /** Absolute path of the parent file that imported this node. */
  from: string;
  /** Import specifier used for this hop (display label). */
  label: string;
}

function packageOwningFile(
  filePath: string,
  index: PackageIndex,
): string | null {
  let best: { name: string; dir: string } | null = null;
  for (const [name, info] of index) {
    const prefix = info.dir.endsWith(path.sep)
      ? info.dir
      : info.dir + path.sep;
    if (filePath === info.dir || filePath.startsWith(prefix)) {
      if (!best || info.dir.length > best.dir.length) {
        best = { name, dir: info.dir };
      }
    }
  }
  return best?.name ?? null;
}

function resolveTargetFile(target: string, entryDir: string): string | null {
  const candidates = [
    path.resolve(target),
    path.resolve(process.cwd(), target),
    path.resolve(entryDir, target),
  ];
  for (const c of candidates) {
    const resolved = existsResolve(c);
    if (resolved) return resolved;
  }
  return null;
}

function isTargetMatch(
  target: string,
  targetFile: string | null,
  spec: string,
  resolved: ResolveResult,
  index: PackageIndex,
): string | null {
  if (!resolved) return null;

  if (resolved.kind === "external") {
    if (resolved.root === target || spec === target) {
      return resolved.root;
    }
    return null;
  }

  // Workspace package name — first hop that enters that package (or imports it).
  if (index.has(target)) {
    if (spec === target || spec.startsWith(target + "/")) {
      return spec;
    }
    const owner = packageOwningFile(resolved.path, index);
    if (owner === target) {
      return spec;
    }
  }

  if (targetFile && resolved.path === targetFile) {
    return spec;
  }

  return null;
}

/**
 * BFS for the shortest import path from `entryPath` to `target`.
 *
 * `target` may be a workspace file path, workspace package name, or external
 * package root (e.g. `stripe`).
 */
export function findPath(
  entryPath: string,
  target: string,
  options: GraphWalkOptions = {},
): FindPathResult {
  const includeTypes = options.includeTypes ?? false;
  const entry = path.resolve(entryPath);
  const root = options.root ?? findMonorepoRoot(path.dirname(entry));
  const index = buildPackageIndex(root);
  const targetFile = resolveTargetFile(target, path.dirname(entry));

  // Entry itself is the target file.
  if (targetFile && entry === targetFile) {
    return [path.relative(process.cwd(), entry) || path.basename(entry)];
  }

  // Entry file belongs to a targeted workspace package.
  if (index.has(target)) {
    const owner = packageOwningFile(entry, index);
    if (owner === target) {
      return [
        path.relative(process.cwd(), entry) || path.basename(entry),
        target,
      ];
    }
  }

  const parent = new Map<string, Hop>(); // child file → how we reached it
  const seen = new Set<string>([entry]);
  const queue: string[] = [entry];

  while (queue.length) {
    const file = queue.shift()!;
    let raw: string;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const src = file.endsWith(".vue") ? readSource(file) : raw;

    for (const { spec, isTypeOnly } of extractImports(src)) {
      if (isTypeOnly && !includeTypes) continue;
      const resolved = resolveSpecifier(spec, file, index);

      const hit = isTargetMatch(target, targetFile, spec, resolved, index);
      if (hit) {
        const labels: string[] = [hit];
        let cur = file;
        while (cur !== entry) {
          const hop = parent.get(cur);
          if (!hop) break;
          labels.push(hop.label);
          cur = hop.from;
        }
        labels.push(
          path.relative(process.cwd(), entry) || path.basename(entry),
        );
        labels.reverse();
        return labels;
      }

      if (resolved?.kind === "file" && !seen.has(resolved.path)) {
        seen.add(resolved.path);
        parent.set(resolved.path, { from: file, label: spec });
        queue.push(resolved.path);
      }
    }
  }

  return null;
}
