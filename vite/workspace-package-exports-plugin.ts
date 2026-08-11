import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

type PackageInfo = {
  dir: string;
  exports: unknown;
};

type PackageIndex = Map<string, PackageInfo>;

type ResolveResult =
  | { kind: "file"; path: string }
  | { kind: "external"; root: string }
  | null;

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage"]);

function findMonorepoRoot(fromDir: string): string {
  let dir = path.resolve(fromDir);
  for (;;) {
    const pjPath = path.join(dir, "package.json");
    try {
      const pj = JSON.parse(fs.readFileSync(pjPath, "utf8")) as {
        workspaces?: unknown;
      };
      if (pj.workspaces) return dir;
    } catch {
      // keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find monorepo root from ${fromDir}`);
    }
    dir = parent;
  }
}

function scanPackageDirs(dir: string, depth = 0, out: string[] = []): string[] {
  if (depth > 6) return out;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  if (entries.some((e) => e.name === "package.json" && e.isFile())) {
    out.push(dir);
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    scanPackageDirs(path.join(dir, e.name), depth + 1, out);
  }
  return out;
}

function buildPackageIndex(root: string): PackageIndex {
  const index: PackageIndex = new Map();
  for (const dir of scanPackageDirs(root)) {
    try {
      const pj = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf8"),
      ) as { name?: string; exports?: unknown };
      if (!pj.name) continue;
      index.set(pj.name, { dir, exports: pj.exports });
    } catch {
      // skip invalid package.json
    }
  }
  return index;
}

function matchExportPattern(
  importKey: string,
  patternKey: string,
  patternTarget: string,
): string | null {
  const pkParts = patternKey.split("/");
  const ikParts = importKey.split("/");
  if (pkParts.length !== ikParts.length) return null;
  const captures: string[] = [];
  for (let i = 0; i < pkParts.length; i++) {
    if (pkParts[i] === "*") {
      captures.push(ikParts[i]!);
    } else if (pkParts[i] !== ikParts[i]) {
      return null;
    }
  }
  let out = patternTarget;
  for (const c of captures) {
    const idx = out.indexOf("*");
    if (idx === -1) return null;
    out = out.slice(0, idx) + c + out.slice(idx + 1);
  }
  return out.includes("*") ? null : out;
}

function sortExportPatternKeys(keys: string[]): string[] {
  return keys.sort((a, b) => {
    const aParts = a.split("/").length;
    const bParts = b.split("/").length;
    if (aParts !== bParts) return bParts - aParts;
    const aStars = (a.match(/\*/g) ?? []).length;
    const bStars = (b.match(/\*/g) ?? []).length;
    return aStars - bStars;
  });
}

function resolveExportTarget(pkg: PackageInfo, subpath: string): string | null {
  const exp = pkg.exports;
  const key = subpath === "" ? "." : "./" + subpath;
  if (!exp) return null;
  if (typeof exp === "string") {
    return key === "." ? path.join(pkg.dir, exp) : null;
  }
  if (typeof exp !== "object" || exp === null) return null;
  const map = exp as Record<string, unknown>;
  const target = map[key];
  if (typeof target === "string") return path.join(pkg.dir, target);
  if (target && typeof target === "object") {
    const cond = target as Record<string, unknown>;
    const t = cond.import ?? cond.default ?? cond.node;
    if (typeof t === "string") return path.join(pkg.dir, t);
  }

  const patternKeys = sortExportPatternKeys(
    Object.keys(map).filter((k) => k.includes("*")),
  );
  for (const patternKey of patternKeys) {
    const patternTarget = map[patternKey];
    if (typeof patternTarget !== "string") continue;
    const substituted = matchExportPattern(key, patternKey, patternTarget);
    if (substituted) return path.join(pkg.dir, substituted);
  }
  return null;
}

function existsResolve(p: string): string | null {
  const candidates = [
    p,
    p + ".ts",
    p + ".tsx",
    p + ".vue",
    p + ".js",
    path.join(p, "index.ts"),
    path.join(p, "index.tsx"),
    path.join(p, "index.js"),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      // try next
    }
  }
  return null;
}

function resolveSpecifier(
  spec: string,
  fromFile: string,
  index: PackageIndex,
): ResolveResult {
  if (spec.startsWith(".")) {
    const resolved = existsResolve(path.resolve(path.dirname(fromFile), spec));
    return resolved ? { kind: "file", path: resolved } : null;
  }

  const names = [...index.keys()].sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (spec === name || spec.startsWith(name + "/")) {
      const pkg = index.get(name)!;
      const sub = spec === name ? "" : spec.slice(name.length + 1);
      const exportPath = resolveExportTarget(pkg, sub);
      if (exportPath) {
        const resolved = existsResolve(exportPath);
        if (resolved) return { kind: "file", path: resolved };
      }
      return null;
    }
  }

  return null;
}

export interface WorkspacePackageExportsPluginOptions {
  /** Monorepo root (workspace package.json). Auto-detected when omitted. */
  monorepoRoot?: string;
}

/**
 * Resolve workspace packages through `package.json` exports (including wildcard
 * patterns). Node and Vite greedily match single `*` export keys across path
 * segments; this plugin matches one segment per `*` like `saf-imports` does.
 *
 * Self-contained (no `@saflib/imports`) so minimal Docker images stay small.
 */
export function workspacePackageExportsPlugin(
  options: WorkspacePackageExportsPluginOptions = {},
): Plugin {
  const pluginDir = path.dirname(fileURLToPath(import.meta.url));
  const monorepoRoot =
    options.monorepoRoot ?? findMonorepoRoot(path.join(pluginDir, ".."));
  const index = buildPackageIndex(monorepoRoot);

  return {
    name: "workspace-package-exports",
    enforce: "pre",
    resolveId(source, importer) {
      if (source.startsWith(".")) return null;
      const fromFile = importer
        ? path.normalize(importer.replace(/\?.*$/, ""))
        : pluginDir;
      const result = resolveSpecifier(source, fromFile, index);
      return result?.kind === "file" ? result.path : null;
    },
  };
}
