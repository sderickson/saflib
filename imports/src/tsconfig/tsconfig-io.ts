import fs from "node:fs";
import path from "node:path";

export interface TsconfigReference {
  path: string;
}

export interface TsconfigJson {
  files?: string[];
  references?: TsconfigReference[];
  [key: string]: unknown;
}

export function readTsconfigJson(tsconfigPath: string): TsconfigJson {
  const text = fs.readFileSync(tsconfigPath, "utf8");
  return JSON.parse(text) as TsconfigJson;
}

export function writeTsconfigJson(
  tsconfigPath: string,
  config: TsconfigJson,
): void {
  fs.writeFileSync(
    tsconfigPath,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  );
}

/** Paths that stay inside the package (e.g. `./tsconfig.app.json`). */
export function isInternalReference(
  packageDir: string,
  refPath: string | undefined,
): boolean {
  if (typeof refPath !== "string" || refPath.length === 0) return false;
  if (path.isAbsolute(refPath)) return false;
  const resolved = path.resolve(packageDir, refPath);
  const rel = path.relative(packageDir, resolved);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function readReferences(tsconfigPath: string): TsconfigReference[] {
  if (!fs.existsSync(tsconfigPath)) return [];
  const config = readTsconfigJson(tsconfigPath);
  return (config.references ?? [])
    .filter(
      (r): r is TsconfigReference =>
        typeof r?.path === "string" && r.path.length > 0,
    )
    .map((r) => ({ path: r.path }));
}

export function sortReferences(
  refs: TsconfigReference[],
): TsconfigReference[] {
  const byPath = new Map<string, TsconfigReference>();
  for (const ref of refs) {
    if (typeof ref.path !== "string" || ref.path.length === 0) continue;
    byPath.set(ref.path, { path: ref.path });
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function referencesEqual(
  a: TsconfigReference[],
  b: TsconfigReference[],
): boolean {
  const sa = sortReferences(a);
  const sb = sortReferences(b);
  if (sa.length !== sb.length) return false;
  return sa.every((ref, i) => ref.path === sb[i]!.path);
}

/**
 * Merge generated workspace refs with on-disk internal leaf refs (Vue app/node).
 */
export function mergePackageReferences(
  packageDir: string,
  existing: TsconfigReference[],
  workspaceRefs: TsconfigReference[],
): TsconfigReference[] {
  const internal = existing.filter(
    (r) =>
      typeof r?.path === "string" &&
      r.path.length > 0 &&
      isInternalReference(packageDir, r.path),
  );
  return sortReferences([...internal, ...workspaceRefs]);
}
