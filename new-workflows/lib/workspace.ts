/**
 * Workflow workspace: run steps in a clone on fast local disk instead of the
 * user's checkout.
 *
 * When the checkout is a bind mount (dev-site in a container on macOS),
 * every file operation an agent or step commit makes crosses the VM's file
 * sharing and is 10–100× slower than local disk. With a workspace
 * configured, each root advance:
 *
 * 1. **Syncs in**: resets the clone to the checkout's `HEAD` and carries
 *    over the checkout's uncommitted changes, in the superproject and in
 *    each submodule. The checkout is read, never modified.
 * 2. Runs the step in the clone (paths under the checkout root map to the
 *    clone; see {@link toWorkspacePath}).
 * 3. **Syncs out** when the advance stops, however it stops: the step's
 *    commits fast-forward the checkout's branch when that's safe, or land
 *    on `workflows/<run-id>` when it isn't; everything uncommitted
 *    (including all submodule changes) is applied to the checkout's
 *    working tree uncommitted, for the user to review.
 *
 * The checkout stays the source of truth between advances; the clone is
 * scratch space. Advances are already serialized by `withRunLock`, so one
 * clone serves every run.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { subprocessEnv } from "./subprocess-env.ts";
import type { WorkflowContext } from "./types.ts";

export interface WorkflowWorkspaceConfig {
  /** The user's checkout, e.g. `/repo`. Run rows keep paths under it. */
  hostRoot: string;
  /** Where the workspace clone lives, e.g. `/workspace/repo`. */
  root: string;
  /**
   * Installs dependencies in the clone; run when any `package-lock.json`
   * changed since the last install. Default `["npm", "ci"]`; `[]` disables.
   */
  installCommand?: string[];
}

type Log = WorkflowContext["log"];

/** Hidden refs used to move commits between checkout and clone. */
const REF_HEAD = "refs/saf-workspace/head";
const REF_SNAPSHOT = "refs/saf-workspace/snapshot";
const REF_RESULT = "refs/saf-workspace/result";
const WORKSPACE_BRANCH = "saf-workspace";
/** Branch run commits land on when the checkout's branch can't be fast-forwarded. */
export function runBranchName(runId: string): string {
  return `workflows/${runId}`;
}

const activeWorkspace = new AsyncLocalStorage<WorkflowWorkspaceConfig>();

/**
 * Maps a path under the checkout to the same path in the active workspace
 * clone. Identity when no workspace is active, or when the path is already
 * in the clone (child runs and step results store clone paths).
 */
export function toWorkspacePath(p: string): string;
export function toWorkspacePath(p: string | null | undefined): string | null | undefined;
export function toWorkspacePath(p: string | null | undefined): string | null | undefined {
  const ws = activeWorkspace.getStore();
  if (!ws || !p) return p;
  if (p === ws.hostRoot) return ws.root;
  if (p.startsWith(ws.hostRoot + "/")) return ws.root + p.slice(ws.hostRoot.length);
  return p;
}

/**
 * Runs `fn` with the workspace synced in before and synced out after —
 * even when `fn` throws. Only the outermost advance should call this;
 * nested `call-workflow` advances run inside the same sync.
 */
export async function withWorkspace<T>(
  config: WorkflowWorkspaceConfig,
  runId: string,
  log: Log,
  fn: () => Promise<T>,
): Promise<T> {
  await syncIn(config, runId, log);
  try {
    return await activeWorkspace.run(config, fn);
  } finally {
    try {
      await syncOut(config, runId, log);
    } catch (error) {
      log({
        channel: "tool",
        level: "error",
        content:
          `Couldn't bring this step's changes back to your checkout: ${errorMessage(error)}\n` +
          `They're still in the workflow workspace (${config.root}); the next advance retries before it starts.`,
      });
    }
  }
}

// --- git plumbing -----------------------------------------------------------

interface GitOptions {
  env?: Record<string, string>;
  input?: string | Buffer;
}

function git(cwd: string, args: string[], options: GitOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      env: { ...subprocessEnv(), ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (d: Buffer) => out.push(d));
    child.stderr.on("data", (d: Buffer) => err.push(d));
    child.on("error", reject);
    child.on("close", (code) => {
      const stdout = Buffer.concat(out).toString();
      if (code === 0) return resolve(stdout);
      const detail = [stdout, Buffer.concat(err).toString()].filter((s) => s.trim()).join("\n").trim();
      reject(new Error(`git ${args.join(" ")} (in ${cwd}) failed: ${detail || `exit ${code}`}`));
    });
    child.stdin.end(options.input ?? "");
  });
}

async function tryGit(cwd: string, args: string[]): Promise<string | undefined> {
  try {
    return (await git(cwd, args)).trim();
  } catch {
    return undefined;
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * A commit whose tree is `repo`'s working tree as it is right now (tracked
 * and untracked, ignored files excluded), with `HEAD` as parent — or
 * `HEAD` itself when nothing is uncommitted. Uses a scratch index, so the
 * repo's own index and working tree are left alone. Submodules are
 * recorded as gitlinks at their checked-out commit, never descended into.
 */
export async function snapshotWorkingTree(repo: string): Promise<{ head: string; snapshot: string }> {
  const head = (await git(repo, ["rev-parse", "HEAD"])).trim();
  const indexPath = path.resolve(repo, (await git(repo, ["rev-parse", "--git-path", "index"])).trim());
  const scratch = await mkdtemp(path.join(tmpdir(), "saf-workspace-index-"));
  const scratchIndex = path.join(scratch, "index");
  try {
    // Starting from a copy of the real index keeps `add -A` fast: unchanged
    // files are recognized by their cached stat data instead of re-hashed.
    if (await exists(indexPath)) await copyFile(indexPath, scratchIndex);
    const env = { GIT_INDEX_FILE: scratchIndex };
    await git(repo, ["add", "-A"], { env });
    const tree = (await git(repo, ["write-tree"], { env })).trim();
    const headTree = (await git(repo, ["rev-parse", "HEAD^{tree}"])).trim();
    if (tree === headTree) return { head, snapshot: head };
    const snapshot = (
      await git(repo, ["commit-tree", tree, "-p", head, "-m", "saf-workspace snapshot"])
    ).trim();
    return { head, snapshot };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/** Paths of the checkout's initialized submodules (one level). */
async function listSubmodules(hostRoot: string): Promise<string[]> {
  const out = await tryGit(hostRoot, [
    "config",
    "-f",
    ".gitmodules",
    "--get-regexp",
    "^submodule\\..*\\.path$",
  ]);
  if (!out) return [];
  const paths = out
    .split("\n")
    .map((line) => line.split(" ").slice(1).join(" "))
    .filter(Boolean);
  const initialized: string[] = [];
  for (const p of paths) {
    if (await exists(path.join(hostRoot, p, ".git"))) initialized.push(p);
  }
  return initialized;
}

/** `git show <rev>:<path>` as bytes, or undefined when the path doesn't exist there. */
async function blobAt(repo: string, rev: string, file: string): Promise<Buffer | undefined> {
  const out = await new Promise<Buffer | undefined>((resolve) => {
    const child = spawn("git", ["show", `${rev}:${file}`], { cwd: repo, env: subprocessEnv() });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (d: Buffer) => chunks.push(d));
    child.on("error", () => resolve(undefined));
    child.on("close", (code) => resolve(code === 0 ? Buffer.concat(chunks) : undefined));
  });
  return out;
}

/** `git merge-file -p`: returns the merged text and whether it has conflicts. */
async function mergeFile(ours: Buffer, base: Buffer, theirs: Buffer): Promise<{ merged: Buffer; conflicts: boolean }> {
  const dir = await mkdtemp(path.join(tmpdir(), "saf-workspace-merge-"));
  try {
    const files = ["ours", "base", "theirs"].map((n) => path.join(dir, n));
    await Promise.all([ours, base, theirs].map((content, i) => writeFile(files[i]!, content)));
    return await new Promise((resolve, reject) => {
      const child = spawn(
        "git",
        ["merge-file", "-p", "-L", "your checkout", "-L", "before the step", "-L", "workflow", ...files],
        { env: subprocessEnv() },
      );
      const chunks: Buffer[] = [];
      child.stdout.on("data", (d: Buffer) => chunks.push(d));
      child.on("error", reject);
      // Exit code is the number of conflicts; negative (>127 here) means an error.
      child.on("close", (code) =>
        code !== null && code >= 0 && code < 128
          ? resolve({ merged: Buffer.concat(chunks), conflicts: code > 0 })
          : reject(new Error(`git merge-file failed (exit ${code})`)),
      );
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Applies the workspace's `from..to` changes to `hostRepo`'s working tree.
 * Applies the patch whole when the checkout still matches `from`; when the
 * user edited some of the same files meanwhile, merges file by file
 * (`git merge-file`) and leaves conflict markers where both changed the
 * same lines. Never touches the checkout's index.
 */
async function applyChanges(
  hostRepo: string,
  workspaceRepo: string,
  from: string,
  to: string,
  patch: string,
): Promise<{ conflicted: string[] }> {
  try {
    await git(hostRepo, ["apply", "--whitespace=nowarn", "-"], { input: patch });
    return { conflicted: [] };
  } catch {
    // Fall through to a per-file merge.
  }
  const changed = (
    await git(workspaceRepo, ["diff", "--name-only", "-z", "--no-renames", "--ignore-submodules=all", from, to])
  )
    .split("\0")
    .filter(Boolean);
  const conflicted: string[] = [];
  for (const file of changed) {
    const target = path.join(hostRepo, file);
    const base = await blobAt(workspaceRepo, from, file);
    const theirs = await blobAt(workspaceRepo, to, file);
    const ours = await readFile(target).catch(() => undefined);
    const same = (a: Buffer | undefined, b: Buffer | undefined) =>
      a === undefined ? b === undefined : b !== undefined && a.equals(b);

    if (same(ours, base) || same(ours, theirs)) {
      // Untouched in the checkout (or already identical): take the workflow's version.
      if (theirs === undefined) await rm(target, { force: true });
      else {
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, theirs);
      }
      continue;
    }
    if (ours !== undefined && base !== undefined && theirs !== undefined) {
      const { merged, conflicts } = await mergeFile(ours, base, theirs);
      await writeFile(target, merged);
      if (conflicts) conflicted.push(file);
      continue;
    }
    // Added on both sides, or deleted on one side and edited on the other:
    // keep the checkout's version and say so.
    conflicted.push(file);
  }
  return { conflicted };
}

function changedFileCount(patch: string): number {
  return patch.split("\n").filter((line) => line.startsWith("diff --git ")).length;
}

// --- workspace state --------------------------------------------------------

interface WorkspaceState {
  /** Set while a sync out is in progress or failed; retried before the next sync in. */
  pendingSyncOutRunId?: string;
}

function statePath(config: WorkflowWorkspaceConfig): string {
  return path.join(config.root, ".git", "saf-workspace.json");
}

async function readState(config: WorkflowWorkspaceConfig): Promise<WorkspaceState> {
  try {
    return JSON.parse(await readFile(statePath(config), "utf8")) as WorkspaceState;
  } catch {
    return {};
  }
}

async function writeState(config: WorkflowWorkspaceConfig, state: WorkspaceState): Promise<void> {
  await writeFile(statePath(config), JSON.stringify(state));
}

/** Clones the checkout (and its submodules) into the workspace if missing. */
async function ensureClone(config: WorkflowWorkspaceConfig, log: Log): Promise<void> {
  const { hostRoot, root } = config;
  if (!(await exists(path.join(root, ".git")))) {
    log({ channel: "tool", level: "info", content: `Setting up the workflow workspace in ${root}…` });
    await rm(root, { recursive: true, force: true });
    await mkdir(path.dirname(root), { recursive: true });
    await git(path.dirname(root), ["clone", "-q", "--no-checkout", hostRoot, root]);
  }
  for (const sub of await listSubmodules(hostRoot)) {
    const subRoot = path.join(root, sub);
    if (await exists(path.join(subRoot, ".git"))) continue;
    await rm(subRoot, { recursive: true, force: true });
    await mkdir(path.dirname(subRoot), { recursive: true });
    await git(root, ["clone", "-q", "--no-checkout", path.join(hostRoot, sub), subRoot]);
  }
  // Commits in the clone should look like commits in the checkout: same
  // hooks (e.g. secret scanning) and identity.
  for (const key of ["core.hooksPath", "user.name", "user.email"]) {
    const value = await tryGit(hostRoot, ["config", "--get", key]);
    if (value) await git(root, ["config", key, value]);
  }
}

async function lockfileHash(root: string, repos: string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const repo of repos) {
    const files = (await git(repo, ["ls-files", "-z"]))
      .split("\0")
      .filter((f) => f === "package-lock.json" || f.endsWith("/package-lock.json"))
      .sort();
    for (const file of files) {
      hash.update(path.relative(root, path.join(repo, file)));
      hash.update(await readFile(path.join(repo, file)).catch(() => Buffer.alloc(0)));
    }
  }
  return hash.digest("hex");
}

async function ensureDependencies(
  config: WorkflowWorkspaceConfig,
  repos: string[],
  log: Log,
): Promise<void> {
  const command = config.installCommand ?? ["npm", "ci"];
  if (command.length === 0) return;
  const marker = path.join(config.root, ".git", "saf-workspace-deps");
  const hash = await lockfileHash(config.root, repos);
  const previous = await readFile(marker, "utf8").catch(() => "");
  if (previous === hash) return;

  log({
    channel: "tool",
    level: "info",
    content: `Installing dependencies in the workflow workspace (${command.join(" ")}); lockfiles changed since the last install…`,
  });
  const started = Date.now();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command[0]!, command.slice(1), {
      cwd: config.root,
      env: subprocessEnv(),
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command.join(" ")} failed (exit ${code}): ${stderr.trim().slice(-2000)}`)),
    );
  });
  await writeFile(marker, hash);
  log({
    channel: "tool",
    level: "info",
    content: `Dependencies installed (${((Date.now() - started) / 1000).toFixed(0)}s).`,
  });
}

// --- sync in ----------------------------------------------------------------

async function syncRepoIn(hostRepo: string, workspaceRepo: string): Promise<boolean> {
  const { head, snapshot } = await snapshotWorkingTree(hostRepo);
  await git(hostRepo, ["update-ref", REF_HEAD, head]);
  await git(hostRepo, ["update-ref", REF_SNAPSHOT, snapshot]);
  await git(workspaceRepo, ["fetch", "-q", "--no-tags", hostRepo, "+refs/saf-workspace/*:refs/saf-workspace/*"]);
  // `-f` and `clean` discard whatever the last advance left; it was synced
  // out already. `clean` without `-x` keeps ignored files (node_modules).
  await git(workspaceRepo, ["checkout", "-q", "-f", "-B", WORKSPACE_BRANCH, REF_HEAD]);
  await git(workspaceRepo, ["clean", "-q", "-fd"]);
  if (snapshot !== head) {
    // The checkout's uncommitted changes, uncommitted here too.
    await git(workspaceRepo, ["read-tree", "-m", "-u", REF_HEAD, REF_SNAPSHOT]);
    await git(workspaceRepo, ["reset", "-q"]);
  }
  return snapshot !== head;
}

/**
 * Makes the workspace match the checkout: its `HEAD` plus its uncommitted
 * changes, in the superproject and every submodule. Retries a failed sync
 * out first, so a failure never loses work.
 */
export async function syncIn(config: WorkflowWorkspaceConfig, runId: string, log: Log): Promise<void> {
  const started = Date.now();
  await ensureClone(config, log);

  const state = await readState(config);
  if (state.pendingSyncOutRunId) {
    log({ channel: "tool", level: "info", content: "Retrying the last sync back to your checkout…" });
    await syncOut(config, state.pendingSyncOutRunId, log);
  }

  // A previous advance whose commits couldn't fast-forward the checkout left
  // them on the run's branch. Starting from the checkout's HEAD would drop
  // them from this run's history.
  const runBranch = `refs/heads/${runBranchName(runId)}`;
  if (await tryGit(config.hostRoot, ["rev-parse", "--verify", "-q", runBranch])) {
    const merged = await tryGit(config.hostRoot, ["merge-base", "--is-ancestor", runBranch, "HEAD"]);
    if (merged === undefined) {
      throw new Error(
        `This run's earlier commits are on branch ${runBranchName(runId)}, which isn't in your current branch. ` +
          `Merge it (or delete the branch to drop those commits), then continue.`,
      );
    }
  }

  const submodules = await listSubmodules(config.hostRoot);
  const carried: string[] = [];
  if (await syncRepoIn(config.hostRoot, config.root)) carried.push("checkout");
  for (const sub of submodules) {
    if (await syncRepoIn(path.join(config.hostRoot, sub), path.join(config.root, sub))) carried.push(sub);
  }
  await ensureDependencies(config, [config.root, ...submodules.map((s) => path.join(config.root, s))], log);

  log({
    channel: "tool",
    level: "info",
    content:
      `Synced the workflow workspace from your checkout (${((Date.now() - started) / 1000).toFixed(1)}s)` +
      (carried.length ? `; carried over uncommitted changes in ${carried.join(", ")}` : ""),
  });
}

// --- sync out ---------------------------------------------------------------

/**
 * Brings an advance's results back to the checkout:
 *
 * - Commits fast-forward the checkout's branch when its HEAD hasn't moved
 *   since sync in; otherwise they go to `workflows/<run-id>`.
 * - Everything uncommitted (step leftovers, direct agent messages, and all
 *   submodule changes) is applied to the checkout's working tree,
 *   uncommitted, on top of any edits made there meanwhile.
 */
export async function syncOut(config: WorkflowWorkspaceConfig, runId: string, log: Log): Promise<void> {
  const started = Date.now();
  await writeState(config, { pendingSyncOutRunId: runId });
  const notes: string[] = [];

  // Superproject.
  const { hostRoot, root } = config;
  const recordedHead = (await git(root, ["rev-parse", REF_HEAD])).trim();
  const recordedSnapshot = (await git(root, ["rev-parse", REF_SNAPSHOT])).trim();
  const workspaceHead = (await git(root, ["rev-parse", "HEAD"])).trim();
  const { snapshot: final } = await snapshotWorkingTree(root);
  const committed = workspaceHead !== recordedHead;

  if (committed) {
    await git(root, ["push", "-q", "-f", hostRoot, `${workspaceHead}:${REF_RESULT}`]);
    const hostBranch = await tryGit(hostRoot, ["symbolic-ref", "-q", "--short", "HEAD"]);
    const hostHead = (await git(hostRoot, ["rev-parse", "HEAD"])).trim();
    const commitCount = (await git(root, ["rev-list", "--count", `${recordedHead}..${workspaceHead}`])).trim();
    if (hostBranch && hostHead === recordedHead) {
      // Move the branch without touching the working tree, then point the
      // index at the new commit. The working tree still holds the sync-in
      // snapshot plus any edits made meanwhile; the patch below brings it
      // up to the clone's final state.
      await git(hostRoot, ["update-ref", `refs/heads/${hostBranch}`, workspaceHead, recordedHead]);
      await git(hostRoot, ["reset", "-q"]);
      notes.push(`fast-forwarded ${hostBranch} by ${commitCount} commit${commitCount === "1" ? "" : "s"}`);
      // Snapshot → final covers both the new commits and any leftovers;
      // only the leftovers are worth reporting as uncommitted.
      await applyWorkspacePatch(hostRoot, root, recordedSnapshot, final, "checkout", notes, false);
      await noteUncommitted(root, workspaceHead, final, "checkout", notes);
    } else {
      const branch = runBranchName(runId);
      await git(hostRoot, ["update-ref", `refs/heads/${branch}`, workspaceHead]);
      notes.push(
        `your ${hostBranch ? `branch ${hostBranch}` : "HEAD"} moved during the step, so its ${commitCount} commit(s) are on ${branch}`,
      );
      // Only what's left uncommitted, relative to the run's own commits.
      await applyWorkspacePatch(hostRoot, root, workspaceHead, final, "checkout", notes);
    }
  } else {
    await applyWorkspacePatch(hostRoot, root, recordedSnapshot, final, "checkout", notes);
  }

  // Submodules: never committed for the user; their changes come back uncommitted.
  for (const sub of await listSubmodules(hostRoot)) {
    const workspaceSub = path.join(root, sub);
    if (!(await tryGit(workspaceSub, ["rev-parse", "--verify", "-q", REF_SNAPSHOT]))) continue;
    const subSnapshot = (await git(workspaceSub, ["rev-parse", REF_SNAPSHOT])).trim();
    const { snapshot: subFinal } = await snapshotWorkingTree(workspaceSub);
    await applyWorkspacePatch(path.join(hostRoot, sub), workspaceSub, subSnapshot, subFinal, sub, notes);
  }

  await writeState(config, {});
  log({
    channel: "tool",
    level: "info",
    content:
      `Synced back to your checkout (${((Date.now() - started) / 1000).toFixed(1)}s)` +
      (notes.length ? `: ${notes.join("; ")}` : "; nothing changed"),
  });
}

async function noteUncommitted(
  workspaceRepo: string,
  from: string,
  to: string,
  label: string,
  notes: string[],
): Promise<void> {
  if (from === to) return;
  const files = (await git(workspaceRepo, ["diff", "--name-only", "--ignore-submodules=all", from, to]))
    .split("\n")
    .filter(Boolean).length;
  if (files) notes.push(`${files} uncommitted file${files === 1 ? "" : "s"} in ${label}`);
}

async function applyWorkspacePatch(
  hostRepo: string,
  workspaceRepo: string,
  from: string,
  to: string,
  label: string,
  notes: string[],
  /** Report the files as uncommitted (false when they're the new commits themselves). */
  report = true,
): Promise<void> {
  if (from === to) return;
  const patch = await git(workspaceRepo, [
    "diff",
    "--binary",
    "--full-index",
    "--ignore-submodules=all",
    from,
    to,
  ]);
  if (!patch.trim()) return;
  const files = changedFileCount(patch);
  const { conflicted } = await applyChanges(hostRepo, workspaceRepo, from, to, patch);
  const conflictNote = conflicted.length
    ? ` (conflicts with your edits in ${conflicted.join(", ")}; check for conflict markers)`
    : "";
  if (report) notes.push(`${files} uncommitted file${files === 1 ? "" : "s"} in ${label}${conflictNote}`);
  else if (conflictNote) notes.push(`conflicts with your edits in ${label}: ${conflicted.join(", ")}`);
}
