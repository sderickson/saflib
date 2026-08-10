import fs from "node:fs";
import path from "node:path";
import type { MeasureGraphOptions, MeasureGraphResult } from "../types.ts";
import {
  buildPackageIndex,
  findMonorepoRoot,
  resolveSpecifier,
} from "../resolve/index.ts";
import { extractImports } from "./extract-imports.ts";
import { readSource } from "./read-source.ts";

function rootRelativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join("/");
}

/**
 * Walk the static import graph from `entryPath` and count first-party modules,
 * total lines, and distinct external npm package roots.
 */
export function measureGraph(
  entryPath: string,
  options: MeasureGraphOptions = {},
): MeasureGraphResult {
  const includeTypes = options.includeTypes ?? false;
  const verbose = options.verbose ?? false;
  const entry = path.resolve(entryPath);
  const root = options.root ?? findMonorepoRoot(path.dirname(entry));
  const index = buildPackageIndex(root);

  const seen = new Set<string>();
  const external = new Set<string>();
  const stack = [entry];
  let lines = 0;

  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    let raw: string;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    lines += raw.split("\n").length;

    const src = file.endsWith(".vue") ? readSource(file) : raw;
    for (const { spec, isTypeOnly } of extractImports(src)) {
      if (isTypeOnly && !includeTypes) continue;
      const resolved = resolveSpecifier(spec, file, index);
      if (!resolved) continue;
      if (resolved.kind === "file") {
        if (!seen.has(resolved.path)) stack.push(resolved.path);
      } else {
        external.add(resolved.root);
      }
    }
  }

  const result: MeasureGraphResult = {
    modules: seen.size,
    lines,
    ext: external.size,
  };

  if (verbose) {
    result.files = [...seen]
      .map((file) => rootRelativePath(root, file))
      .sort();
    result.externals = [...external].sort();
  }

  return result;
}
