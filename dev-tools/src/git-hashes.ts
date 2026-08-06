import { execSync } from "node:child_process";
import path, { dirname, join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface GitHashesEnvOptions {
  cwd?: string;
}

function execGit(
  args: string[],
  opts: { cwd: string },
): { stdout: string; exitCode: number } {
  const cmd = ["git", ...args].join(" ");
  try {
    const stdout = execSync(cmd, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    return { stdout, exitCode: 0 };
  } catch (e) {
    const stdout = e instanceof Error ? e.message : String(e);
    return { stdout, exitCode: 1 };
  }
}

/**
 * saflib root: this file lives at `saflib/dev-tools/src/git-hashes.ts`.
 * Prefer that over assuming `./saflib` under the git root (submodules / nested monorepos).
 */
export function findSaflibDir(): string {
  return path.resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/**
 * Product / workspace root: nearest ancestor with `package-lock.json`
 * (npm workspaces root). Falls back to the git root enclosing `startDir`.
 */
export function findProductRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);
  while (true) {
    if (existsSync(join(currentDir, "package-lock.json"))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  currentDir = path.resolve(startDir);
  while (true) {
    // `.git` can be either a directory or a file (submodules).
    if (existsSync(join(currentDir, ".git"))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        `Unable to locate product root from cwd=${startDir}. Expected a package-lock.json or .git ancestor.`,
      );
    }
    currentDir = parentDir;
  }
}

function hasUncommittedChanges(cwd: string): boolean {
  const diffQuiet = execGit(["diff", "--quiet"], { cwd });
  if (diffQuiet.exitCode !== 0) return true;
  const cachedDiffQuiet = execGit(["diff", "--cached", "--quiet"], { cwd });
  if (cachedDiffQuiet.exitCode !== 0) return true;
  const untracked = execGit(
    ["ls-files", "--others", "--exclude-standard"],
    { cwd },
  );
  if (untracked.exitCode === 0 && untracked.stdout.length > 0) return true;
  return false;
}

function getGitHash(cwd: string): string | null {
  const out = execGit(["rev-parse", "HEAD"], { cwd });
  if (out.exitCode !== 0 || !out.stdout) return null;
  return out.stdout;
}

function withDirtySuffix(cwd: string, hash: string): string {
  return hasUncommittedChanges(cwd) ? `${hash}-dirty` : hash;
}

export function writeGitHashesEnvFile(options: GitHashesEnvOptions = {}): {
  root: string;
  saflib: string;
} {
  const cwd = options.cwd ?? process.cwd();

  const productRoot = findProductRoot(cwd);
  const saflibDir = findSaflibDir();

  const rootHash = getGitHash(productRoot) ?? "unknown";
  const rootWithDirty =
    rootHash === "unknown" ? rootHash : withDirtySuffix(productRoot, rootHash);

  let saflibWithDirty = "unknown";
  if (existsSync(saflibDir)) {
    const saflibHash = getGitHash(saflibDir) ?? "unknown";
    saflibWithDirty =
      saflibHash === "unknown"
        ? saflibHash
        : withDirtySuffix(saflibDir, saflibHash);
  }

  const jsonContent =
    JSON.stringify({ root: rootWithDirty, saflib: saflibWithDirty }, null, 2) +
    "\n";

  const nodeJsonPath = join(saflibDir, "node", "git-hashes.json");
  mkdirSync(path.dirname(nodeJsonPath), { recursive: true });
  writeFileSync(nodeJsonPath, jsonContent, "utf8");

  const vueJsonPath = join(saflibDir, "vue", "src", "git-hashes.json");
  mkdirSync(path.dirname(vueJsonPath), { recursive: true });
  writeFileSync(vueJsonPath, jsonContent, "utf8");

  return { root: rootWithDirty, saflib: saflibWithDirty };
}
