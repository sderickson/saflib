import {
  existsSync,
  readdirSync,
  readFileSync,
  type Dirent,
} from "node:fs";
import path from "node:path";

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
]);

export interface IndexedWorkspacePackage {
  dir: string;
  scripts: Record<string, string>;
}

/**
 * Walk up from `start` and return the outermost directory whose package.json
 * declares `workspaces`.
 */
export function findOutermostWorkspaceRoot(start: string): string {
  let dir = path.resolve(start);
  let found = dir;
  while (true) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
          found = dir;
        }
      } catch {
        // ignore invalid package.json
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return found;
}

function shouldSkipDir(name: string): boolean {
  return SKIP_DIR_NAMES.has(name) || name.startsWith(".");
}

/**
 * Index every named package.json under a monorepo root (skipping vendor dirs).
 */
export function indexWorkspacePackages(
  repoRoot: string,
): Map<string, IndexedWorkspacePackage> {
  const index = new Map<string, IndexedWorkspacePackage>();

  const walk = (dir: string) => {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          name?: string;
          scripts?: Record<string, string>;
        };
        if (typeof pkg.name === "string") {
          index.set(pkg.name, {
            dir,
            scripts: pkg.scripts ?? {},
          });
        }
      } catch {
        // ignore invalid package.json
      }
    }

    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || shouldSkipDir(entry.name)) {
        continue;
      }
      walk(path.join(dir, entry.name));
    }
  };

  walk(repoRoot);
  return index;
}

export function buildNpmRunArgs(
  workspace: string,
  script: string,
  args: string[] = [],
): string[] {
  const npmArgs = ["run", script, "-w", workspace];
  if (args.length > 0) {
    npmArgs.push("--", ...args);
  }
  return npmArgs;
}

export function formatNpmScriptCommand(
  workspace: string,
  script: string,
  args: string[] = [],
): string {
  const argSuffix = args.length > 0 ? ` -- ${args.join(" ")}` : "";
  return `npm run ${script} -w ${workspace}${argSuffix}`;
}

export interface ValidateNpmScriptTargetParams {
  workspace: string;
  script: string;
  startDir: string;
  runMode: string;
}

export interface ValidateNpmScriptTargetResult {
  repoRoot: string;
  packageDir: string;
}

/**
 * Validate that an npm workspace and script exist. Throws on invalid targets in
 * dry, checklist, print, run, and script modes (same policy as cd validation).
 */
export function validateNpmScriptTarget(
  params: ValidateNpmScriptTargetParams,
): ValidateNpmScriptTargetResult {
  const shouldValidate =
    params.runMode === "print" ||
    params.runMode === "run" ||
    params.runMode === "dry" ||
    params.runMode === "checklist" ||
    params.runMode === "script";

  if (!shouldValidate) {
    return {
      repoRoot: findOutermostWorkspaceRoot(params.startDir),
      packageDir: params.startDir,
    };
  }

  const repoRoot = findOutermostWorkspaceRoot(params.startDir);
  const packages = indexWorkspacePackages(repoRoot);
  const pkg = packages.get(params.workspace);

  if (!pkg) {
    const known = [...packages.keys()].sort().slice(0, 8);
    const hint =
      known.length > 0 ? ` Known workspaces include: ${known.join(", ")}.` : "";
    throw new Error(
      `npm workspace "${params.workspace}" not found.${hint}`,
    );
  }

  if (!(params.script in pkg.scripts)) {
    const available = Object.keys(pkg.scripts).sort().join(", ");
    throw new Error(
      `npm script "${params.script}" not found in ${params.workspace} (${pkg.dir}). Available scripts: ${available || "(none)"}`,
    );
  }

  return { repoRoot, packageDir: pkg.dir };
}
