import fs from "node:fs";
import path from "node:path";

const DYNAMIC_IMPORT_RE =
  /defineAsyncComponent\s*\(\s*\(\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\s*\)/;

/**
 * Extract the lazy page SFC path from a `*Async.vue` file.
 * Returns repo-relative path to the `.vue` file when resolvable.
 */
export function parseAsyncVuePageTarget(
  asyncVuePath: string,
): string | undefined {
  if (!fs.existsSync(asyncVuePath)) return undefined;
  const src = fs.readFileSync(asyncVuePath, "utf8");
  const m = DYNAMIC_IMPORT_RE.exec(src);
  if (!m) return undefined;
  const importPath = m[1];
  const dir = path.dirname(asyncVuePath);
  let resolved = importPath.startsWith(".")
    ? path.resolve(dir, importPath)
    : path.resolve(dir, importPath);
  if (!resolved.endsWith(".vue")) {
    resolved += ".vue";
  }
  if (!fs.existsSync(resolved)) return undefined;
  return resolved;
}
