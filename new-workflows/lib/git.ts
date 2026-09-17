import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout;
}

/**
 * The repo root containing `cwd`, or `undefined` if `cwd` isn't inside a
 * git working tree at all (e.g. a test fixture's scratch directory) —
 * every operation here is a no-op in that case, not an error, since most
 * of the existing test suite runs against plain temp dirs.
 */
async function findGitRoot(cwd: string): Promise<string | undefined> {
  try {
    return (await runGit(cwd, ["rev-parse", "--show-toplevel"])).trim();
  } catch {
    return undefined;
  }
}

/**
 * Commits every change (tracked + untracked) in `cwd`'s repo, if there are
 * any. No-op — not an error — when `cwd` isn't a git repo, or there's
 * nothing to commit. Returns whether a commit was actually made.
 *
 * Always resolves to the repo *root* first (via `findGitRoot`) rather than
 * operating from `cwd` directly: `git add -A`/`status` are repo-wide
 * regardless of cwd, but doing this consistently at the root keeps this
 * function's behavior independent of which subdirectory a workflow's `cd`
 * steps happen to have left it in.
 */
export async function commitIfDirty(cwd: string, message: string): Promise<boolean> {
  const root = await findGitRoot(cwd);
  if (!root) return false;
  const status = await runGit(root, ["status", "--porcelain"]);
  if (!status.trim()) return false;
  await runGit(root, ["add", "-A"]);
  await runGit(root, ["commit", "-m", message]);
  return true;
}

/**
 * Discards every uncommitted change (tracked + untracked) in `cwd`'s
 * *whole repo* — `git checkout -- .` + `git clean -fd` from the repo root.
 * No-op when `cwd` isn't a git repo.
 *
 * DESTRUCTIVE, and repo-wide: since every successful step commits (see
 * `commitIfDirty`), this is meant to discard exactly what the *last*
 * (failed) step attempt itself changed — but it has no way to distinguish
 * that from any other uncommitted work sitting in the same checkout at
 * the same time (a manual edit, a different concurrently-running run).
 * Only call this right before retrying a step that just failed, on a
 * checkout you're confident nothing else is concurrently editing.
 */
export async function revertUncommittedChanges(cwd: string): Promise<void> {
  const root = await findGitRoot(cwd);
  if (!root) return;
  await runGit(root, ["checkout", "--", "."]);
  await runGit(root, ["clean", "-fd"]);
}
