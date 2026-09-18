import path from "node:path";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  statSync,
  type Dirent,
  type Stats,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  listTree,
  readBlobs,
  writeBlob,
  commitTree,
  openScratchIndex,
  setIndexEntry,
  writeScratchTree,
  closeScratchIndex,
  type ScratchIndex,
} from "@saflib/git";
import { runCopyStep, type CopyStepInput } from "../steps/copy/copy-step.ts";
import { runTransformFileStep, type TransformFileStepInput } from "../steps/transform-file.ts";
import type { CdStepInput } from "../steps/cd.ts";
import type { CallWorkflowStepInput } from "../steps/call-workflow.ts";
import type { DbKey } from "@saflib/new-workflows-db";
import type { WorkflowContext, WorkflowDefinition } from "../types.ts";

export interface PreviewStepEntry {
  /** Which workflow this step belongs to — the root, or a nested `call-workflow` target. */
  workflowId: string;
  stepIndex: number;
  kind: string;
  applied: boolean;
  /** Why a step wasn't applied — either its kind isn't previewable, or it threw. */
  reason?: string;
}

export interface PreviewResult {
  baseHash: string;
  /** Equal to `baseHash` if nothing previewable ran. */
  finalHash: string;
  entries: PreviewStepEntry[];
}

export interface PreviewRunOptions {
  /** Absolute path to the git repo root (not necessarily `cwd`). */
  repoRoot: string;
  /** Commit to preview against — typically the repo's current HEAD. */
  baseHash: string;
  /** The run's own working directory (absolute; may equal `repoRoot` or a subdirectory of it). */
  cwd: string;
}

interface WalkState {
  repoRoot: string;
  scratchRoot: string;
  scratch: ScratchIndex;
  currentHash: string;
  entries: PreviewStepEntry[];
  dbKey: DbKey;
}

/**
 * Computes what a workflow (and any `call-workflow` steps it calls) would
 * change, as a real-but-dangling git commit built entirely via plumbing —
 * no working tree or real index is ever touched, and nothing is persisted.
 * Only `copy`/`transform-file` (file content) and `cd` (bookkeeping only)
 * are actually applied; everything else is recorded as skipped, and the
 * walk continues to the next step in that same list rather than aborting.
 * See `saflib/plans/workflow-preview.md` for the design.
 */
export async function previewRun(
  dbKey: DbKey,
  definition: WorkflowDefinition<any, any>,
  input: Record<string, unknown>,
  options: PreviewRunOptions,
): Promise<PreviewResult> {
  const { repoRoot, baseHash, cwd } = options;
  const { result: scratch, error } = openScratchIndex(repoRoot, baseHash);
  if (error) throw error;

  const scratchRoot = mkdtempSync(path.join(tmpdir(), "saflib-preview-"));
  const state: WalkState = {
    repoRoot,
    scratchRoot,
    scratch: scratch!,
    currentHash: baseHash,
    entries: [],
    dbKey,
  };

  // The preview `cwd` mirrors the real repo's directory layout under a
  // scratch root, so any path a step computes off `ctx.cwd` — even one
  // built as an absolute `path.join(cwd, "sub")` before the step ever sees
  // it — lands in the scratch root at the *same relative position* it
  // would occupy in the real repo. That's what makes stripping the scratch
  // root back off (`path.relative(scratchRoot, absPath)`) yield the
  // correct repo-relative path for git plumbing.
  const repoRelativeCwd = path.relative(repoRoot, cwd);
  const previewCwd = path.join(scratchRoot, repoRelativeCwd);
  mkdirSync(previewCwd, { recursive: true });

  try {
    await walkSteps(state, definition, input, previewCwd, previewCwd);
  } finally {
    closeScratchIndex(state.scratch);
    rmSync(scratchRoot, { recursive: true, force: true });
  }

  return { baseHash, finalHash: state.currentHash, entries: state.entries };
}

async function walkSteps(
  state: WalkState,
  def: WorkflowDefinition<any, any>,
  input: Record<string, unknown>,
  cwd: string,
  originalCwd: string,
): Promise<void> {
  let rollingCwd = cwd;

  for (let stepIndex = 0; stepIndex < def.steps.length; stepIndex++) {
    const step = def.steps[stepIndex];
    const context = def.context({ input, cwd: rollingCwd });

    if (step.kind === "cd") {
      const stepInput = step.input({ context }) as CdStepInput;
      rollingCwd = stepInput.path.startsWith("/")
        ? stepInput.path
        : path.join(originalCwd, stepInput.path);
      state.entries.push({ workflowId: def.id, stepIndex, kind: step.kind, applied: true });
      continue;
    }

    if (step.kind === "copy" || step.kind === "transform-file") {
      const stepInput = step.input({ context });
      try {
        await applyFileStep(state, step.kind, stepInput, rollingCwd);
        state.entries.push({ workflowId: def.id, stepIndex, kind: step.kind, applied: true });
      } catch (err) {
        state.entries.push({
          workflowId: def.id,
          stepIndex,
          kind: step.kind,
          applied: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    if (step.kind === "call-workflow") {
      const stepInput = step.input({ context }) as CallWorkflowStepInput;
      state.entries.push({ workflowId: def.id, stepIndex, kind: step.kind, applied: true });
      await walkSteps(state, stepInput.targetDefinition, stepInput.targetInput, rollingCwd, rollingCwd);
      continue;
    }

    state.entries.push({
      workflowId: def.id,
      stepIndex,
      kind: step.kind,
      applied: false,
      reason: "needs a real run",
    });
  }
}

/** Minimal `WorkflowContext` for a mechanical step — nothing else reads `dbKey`/`log`/agent fields. */
function fileStepContext(state: WalkState, cwd: string): WorkflowContext {
  return {
    runId: "preview",
    workflowId: "preview",
    stepIndex: 0,
    dbKey: state.dbKey,
    // Never "dry"/"checklist" — those modes skip the real work entirely,
    // which is the opposite of what a preview needs. `copy`/`transform-file`
    // don't otherwise branch on mode.
    mode: "script",
    cwd,
    originalWorkingDirectory: cwd,
    copiedFiles: {},
    isResume: false,
    log: () => {},
  };
}

async function applyFileStep(
  state: WalkState,
  kind: "copy" | "transform-file",
  stepInput: unknown,
  cwd: string,
): Promise<void> {
  const relRoot =
    kind === "copy"
      ? path.relative(state.scratchRoot, (stepInput as CopyStepInput).targetDir)
      : path.relative(state.scratchRoot, resolveTransformFilePath(stepInput as TransformFileStepInput, cwd));

  materialize(state, relRoot);
  try {
    const ctx = fileStepContext(state, cwd);
    const outcome =
      kind === "copy"
        ? await runCopyStep(stepInput as CopyStepInput, ctx)
        : await runTransformFileStep(stepInput as TransformFileStepInput, ctx);
    if (outcome.status === "error") {
      throw new Error(outcome.message);
    }
    await commitTouchedFiles(state, relRoot);
  } finally {
    rmSync(path.join(state.scratchRoot, relRoot), { recursive: true, force: true });
  }
}

function resolveTransformFilePath(input: TransformFileStepInput, cwd: string): string {
  return input.filePath.startsWith("/") ? input.filePath : path.join(cwd, input.filePath);
}

/** Pulls the current running commit's version of `relRoot` (file or directory) onto scratch disk. */
function materialize(state: WalkState, relRoot: string): void {
  const { result: entries, error } = listTree(state.repoRoot, state.currentHash, relRoot);
  if (error) throw error;
  if (!entries || entries.length === 0) return;

  const { result: blobs, error: blobsError } = readBlobs(
    state.repoRoot,
    entries.map((e) => e.blobHash),
  );
  if (blobsError) throw blobsError;

  for (const entry of entries) {
    const content = blobs!.get(entry.blobHash);
    if (content === undefined) continue;
    const dest = path.join(state.scratchRoot, entry.path);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, content, "utf-8");
  }
}

/** Hashes and stages every file now present under `relRoot`, then advances the running commit. */
async function commitTouchedFiles(state: WalkState, relRoot: string): Promise<void> {
  const absRoot = path.join(state.scratchRoot, relRoot);
  const files = listFilesRecursive(absRoot);
  if (files.length === 0) return;

  for (const absFile of files) {
    const relPath = path.relative(state.scratchRoot, absFile).split(path.sep).join("/");
    const content = readFileSync(absFile, "utf-8");
    const { result: blobHash, error } = writeBlob(state.repoRoot, content);
    if (error) throw error;
    const { error: setError } = setIndexEntry(state.scratch, relPath, blobHash!);
    if (setError) throw setError;
  }

  const { result: treeHash, error: treeError } = writeScratchTree(state.scratch);
  if (treeError) throw treeError;
  const { result: newHash, error: commitError } = commitTree(
    state.repoRoot,
    treeHash!,
    state.currentHash,
    "preview",
  );
  if (commitError) throw commitError;
  state.currentHash = newHash!;
}

/** `root` may itself be a single file (transform-file's `relRoot`) or a directory (copy's). */
function listFilesRecursive(root: string): string[] {
  let stats: Stats;
  try {
    stats = statSync(root);
  } catch {
    return [];
  }
  if (stats.isFile()) return [root];

  const entries: Dirent[] = readdirSync(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));
}
