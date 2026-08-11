import fs from "node:fs";
import path from "node:path";

/**
 * Resolve the TypeScript project-reference entry for a package directory.
 *
 * External packages always reference the package-root `tsconfig.json` (never
 * `tsconfig.app.json` / `tsconfig.node.json` leaf configs). Returns `null` when
 * the package has no typecheckable tsconfig.
 */
export function resolveTsconfigEntry(packageDir: string): string | null {
  const entry = path.join(packageDir, "tsconfig.json");
  if (!fs.existsSync(entry)) return null;
  try {
    if (!fs.statSync(entry).isFile()) return null;
  } catch {
    return null;
  }
  return "tsconfig.json";
}
