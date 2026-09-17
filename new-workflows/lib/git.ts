import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LOCK_RETRY_ATTEMPTS = 5;
const LOCK_RETRY_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const { stdout } = await execFileAsync("git", args, { cwd });
      return stdout;
    } catch (error) {
      const detail = gitErrorDetail(error);
      // `index.lock` is transient by nature — held only for the brief
      // window of another `git add`/`commit` actually running. This
      // module operates repo-*wide* (see `commitIfDirty`'s doc), so two
      // steps (different runs, or a nested + parent pair) touching the
      // same shared checkout at the same moment is an expected case here,
      // not a rare fluke — worth a few short retries before giving up.
      if (detail?.includes("index.lock") && attempt < LOCK_RETRY_ATTEMPTS) {
        await sleep(LOCK_RETRY_DELAY_MS);
        continue;
      }
      // `execFile`'s own error `.message` only ever includes stderr — a
      // git failure that explains itself on stdout (e.g. `commit`'s
      // "nothing to commit, working tree clean") otherwise vanishes
      // entirely from whatever error message a caller persists or
      // displays, making a real failure undiagnosable after the fact.
      if (detail) throw new Error(`git ${args.join(" ")} failed: ${detail}`);
      throw error;
    }
  }
}

function gitErrorDetail(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("stdout" in error || "stderr" in error)) {
    return undefined;
  }
  const { stdout, stderr } = error as { stdout?: string; stderr?: string };
  const detail = [stdout, stderr].filter(Boolean).join("\n").trim();
  return detail || undefined;
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
  // `git add -A` can leave *nothing* actually staged even though `status`
  // reported the tree as dirty — a submodule (e.g. this monorepo's own
  // `saflib`) whose own working tree has uncommitted changes, but whose
  // checked-out commit hasn't changed, shows up as dirty in the
  // superproject ("modified content") with nothing for the superproject
  // itself to stage; only committing *inside* the submodule resolves
  // that, which is out of scope here. Committing anyway would just fail
  // with git's own "no changes added to commit". Checking what's staged
  // (rather than special-casing submodules by name/pattern) generalizes
  // to any other "reported dirty but unstageable from here" case too.
  const staged = await runGit(root, ["diff", "--cached", "--name-only"]);
  if (!staged.trim()) return false;
  try {
    await runGit(root, ["commit", "-m", message]);
  } catch (error) {
    // This operates repo-*wide* (see the module doc), so a genuinely
    // concurrent commit — a different run/step touching the same shared
    // checkout — can land its own commit in the gap between the dirty
    // check above and this one, leaving nothing staged by the time we get
    // here ("nothing to commit, working tree clean"). Re-check rather than
    // pattern-match the error text: if the tree is clean now, the changes
    // this call cared about are already committed (just not by us) — a
    // benign race, not a failure worth surfacing as one.
    const statusAfter = await runGit(root, ["status", "--porcelain"]);
    if (!statusAfter.trim()) return true;
    throw error;
  }
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
