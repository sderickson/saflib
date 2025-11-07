import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
const execAsync = promisify(exec);

let gitRoot: string | undefined;

export const getGitRoot = async () => {
  if (!gitRoot) {
    gitRoot = (await execAsync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    })).stdout.trim();
  }
  return gitRoot;
};

export const getGitChanges = async () => {
  const staged = (await execAsync("git diff --cached --name-only", {
    encoding: "utf8",
    cwd: await getGitRoot(),
  })).stdout
    .trim()
    .split("\n")
    .filter(Boolean);
  
  // Get unstaged changes (modified files)
  const unstaged = (await execAsync("git diff --name-only", {
      encoding: "utf8",
    cwd: await getGitRoot(),
  })).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  // Get untracked files
  const untracked = (await execAsync("git ls-files --others --exclude-standard", {
    cwd: await getGitRoot(),
    encoding: "utf8",
  })).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  const allFiles = [...staged, ...unstaged, ...untracked];
  const gitRoot = await getGitRoot();
  const absoluteAllFiles = allFiles.map((file) => path.join(gitRoot, file));

  return absoluteAllFiles;
}