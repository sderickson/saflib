import { execSync } from "node:child_process";
import path, { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

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

function findGitRepoRoot(startDir: string): string | null {
  let currentDir = startDir;
  while (true) {
    // `.git` can be either a directory or a file (submodules).
    if (existsSync(join(currentDir, ".git"))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
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

export function writeGitHashesEnvFile(options: GitHashesEnvOptions = {}): {
  root: string;
  saflib: string;
} {
  const cwd = options.cwd ?? process.cwd();

  const repoRoot = findGitRepoRoot(cwd);
  if (!repoRoot) {
    throw new Error(
      `Unable to locate git repo root from cwd=${cwd}. Make sure you're running inside the repo.`,
    );
  }

  const rootHash = getGitHash(repoRoot) ?? "unknown";
  const rootDirty = hasUncommittedChanges(repoRoot);
  const rootWithDirty = rootDirty ? `${rootHash}-dirty` : rootHash;

  const saflibDir = join(repoRoot, "saflib");
  let saflibWithDirty = "unknown";
  if (existsSync(saflibDir)) {
    const saflibHash = getGitHash(saflibDir) ?? "unknown";
    const saflibDirty = hasUncommittedChanges(saflibDir);
    saflibWithDirty = saflibDirty ? `${saflibHash}-dirty` : saflibHash;
  }

  const jsonContent =
    JSON.stringify({ root: rootWithDirty, saflib: saflibWithDirty }, null, 2) +
    "\n";

  const nodeJsonPath = join(repoRoot, "saflib", "node", "git-hashes.json");
  mkdirSync(path.dirname(nodeJsonPath), { recursive: true });
  writeFileSync(nodeJsonPath, jsonContent, "utf8");

  const vueJsonPath = join(repoRoot, "saflib", "vue", "src", "git-hashes.json");
  mkdirSync(path.dirname(vueJsonPath), { recursive: true });
  writeFileSync(vueJsonPath, jsonContent, "utf8");

  return { root: rootWithDirty, saflib: saflibWithDirty };
}
