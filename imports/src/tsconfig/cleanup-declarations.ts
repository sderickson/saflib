import fs from "node:fs";
import path from "node:path";

/** Ambient / generated modules that legitimately live next to source. */
const ALLOWED_COLOCATED_DECLARATIONS = new Set([
  "assets.d.ts",
  "env.d.ts",
  "openapi.d.ts",
  "vitest-config.d.ts",
]);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);

export interface CleanupDeclarationArtifactsOptions {
  /** Workspace or product root to scan (default: cwd). */
  root?: string;
  /** When true, only report paths that would be removed. */
  dryRun?: boolean;
}

export interface CleanupDeclarationArtifactsResult {
  rootDir: string;
  removed: string[];
  skipped: string[];
}

function isUnderDistTypes(filePath: string): boolean {
  return filePath.includes(`${path.sep}dist${path.sep}types${path.sep}`);
}

function shouldRemoveDeclarationArtifact(filePath: string): boolean {
  if (isUnderDistTypes(filePath)) {
    return false;
  }

  if (filePath.endsWith(".d.ts.map")) {
    return true;
  }

  if (filePath.endsWith(".d.ts")) {
    return !ALLOWED_COLOCATED_DECLARATIONS.has(path.basename(filePath));
  }

  return false;
}

function walkDeclarationArtifacts(
  dir: string,
  onFile: (absPath: string) => void,
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      walkDeclarationArtifacts(path.join(dir, entry.name), onFile);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const absPath = path.join(dir, entry.name);
    if (
      absPath.endsWith(".d.ts") ||
      absPath.endsWith(".d.ts.map")
    ) {
      onFile(absPath);
    }
  }
}

/**
 * Remove co-located TypeScript declaration emit artifacts.
 *
 * Packages should emit to `dist/types`; maps and `.d.ts` next to `.ts` sources
 * are stale noise (often left when `rootDir` was missing).
 */
export function cleanupDeclarationArtifacts(
  options: CleanupDeclarationArtifactsOptions = {},
): CleanupDeclarationArtifactsResult {
  const rootDir = path.resolve(options.root ?? process.cwd());
  const dryRun = options.dryRun ?? false;
  const removed: string[] = [];
  const skipped: string[] = [];

  walkDeclarationArtifacts(rootDir, (filePath) => {
    if (!shouldRemoveDeclarationArtifact(filePath)) {
      skipped.push(filePath);
      return;
    }

    if (!dryRun) {
      fs.unlinkSync(filePath);
    }
    removed.push(filePath);
  });

  return { rootDir, removed, skipped };
}
