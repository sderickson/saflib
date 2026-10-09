import path from "node:path";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync,
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
import { runCopyStep, resolveCopyTargetPaths, type CopyStepInput } from "../steps/copy/copy-step.ts";
import { runTransformFileStep, type TransformFileStepInput } from "../steps/transform-file.ts";
import type { CdStepInput } from "../steps/cd.ts";
import { validateCdTarget } from "../steps/cd-validation.ts";
import type { CallWorkflowStepInput } from "../steps/call-workflow.ts";
import { isWorkflowStepSkip } from "../conditional-step.ts";
import type { DbKey } from "@saflib/new-workflows-db";
import type { WorkflowContext, WorkflowDefinition } from "../types.ts";

export interface PreviewFileChange {
  /** Repo-relative path. */
  path: string;
  /** Whether this path existed in the running preview commit before this step ran. */
  status: "added" | "modified";
}

export interface PreviewStepEntry {
  /** Which workflow this step belongs to — the root, or a nested `call-workflow` target. */
  workflowId: string;
  stepIndex: number;
  kind: string;
  applied: boolean;
  /** Why a step wasn't applied — either its kind isn't previewable, or it threw. */
  reason?: string;
  /** Only set for applied `copy`/`transform-file` steps — the files it wrote. */
  files?: PreviewFileChange[];
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
  /** Repo-absolute paths of files materialized by earlier preview copy/transform steps. */
  previewCopiedFiles: Record<string, string>;
  /** Repo-relative cwd for workflow `context()` — mirrors a real run's rolling package dir. */
  logicalRepoCwd: string;
}

/**
 * Computes what a workflow (and any `call-workflow` steps it calls) would
 * change, as a real-but-dangling git commit built entirely via plumbing —
 * no working tree or real index is ever touched, and nothing is persisted.
 * Only `copy`/`transform-file` (file content) and `cd` (cwd bookkeeping +
 * package.json validation against the real repo) are actually applied;
 * everything else is recorded as skipped, and the walk continues to the
 * next step in that same list rather than aborting.
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
  const repoRelativeCwd = path.relative(repoRoot, cwd);
  const state: WalkState = {
    repoRoot,
    scratchRoot,
    scratch: scratch!,
    currentHash: baseHash,
    entries: [],
    dbKey,
    previewCopiedFiles: {},
    logicalRepoCwd: repoRelativeCwd.split(path.sep).join("/"),
  };

  // The preview `cwd` mirrors the real repo's directory layout under a
  // scratch root, so any path a step computes off `ctx.cwd` — even one
  // built as an absolute `path.join(cwd, "sub")` before the step ever sees
  // it — lands in the scratch root at the *same relative position* it
  // would occupy in the real repo. That's what makes stripping the scratch
  // root back off (`path.relative(scratchRoot, absPath)`) yield the
  // correct repo-relative path for git plumbing.
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
    const contextCwd =
      def.id === "integrations/init"
        ? path.join(state.repoRoot, state.logicalRepoCwd)
        : rollingCwd;
    const context = def.context({ input, cwd: contextCwd });

    if (step.kind === "cd") {
      const stepInput = step.input({ context }) as CdStepInput;
      const joined = stepInput.path.startsWith("/")
        ? stepInput.path
        : path.join(originalCwd, stepInput.path);
      const underRepo =
        joined === state.repoRoot || joined.startsWith(state.repoRoot + path.sep);
      const nextCwd = underRepo
        ? path.join(state.scratchRoot, path.relative(state.repoRoot, joined))
        : joined;
      if (underRepo) {
        state.logicalRepoCwd = path.relative(state.repoRoot, joined).split(path.sep).join("/");
      }
      try {
        validatePreviewCdStep(state, nextCwd, originalCwd, stepInput);
        rollingCwd = nextCwd;
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

    if (step.kind === "copy" || step.kind === "transform-file") {
      const stepInput = step.input({ context });
      if (isWorkflowStepSkip(stepInput)) {
        state.entries.push({
          workflowId: def.id,
          stepIndex,
          kind: step.kind,
          applied: false,
          reason: "skipped (stepSkipIf)",
        });
        continue;
      }
      try {
        const files = await applyFileStep(state, def.id, stepIndex, step.kind, stepInput, rollingCwd);
        state.entries.push({ workflowId: def.id, stepIndex, kind: step.kind, applied: true, files });
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
      const stepInput = step.input({ context });
      if (isWorkflowStepSkip(stepInput)) {
        state.entries.push({
          workflowId: def.id,
          stepIndex,
          kind: step.kind,
          applied: false,
          reason: "skipped (stepSkipIf)",
        });
        continue;
      }
      const callInput = stepInput as CallWorkflowStepInput;
      state.entries.push({ workflowId: def.id, stepIndex, kind: step.kind, applied: true });
      await walkSteps(state, callInput.targetDefinition, callInput.targetInput, rollingCwd, rollingCwd);
      continue;
    }

    // Evaluate input so stepSkipIf still short-circuits non-file kinds.
    const maybeSkipped = step.input({ context });
    if (isWorkflowStepSkip(maybeSkipped)) {
      state.entries.push({
        workflowId: def.id,
        stepIndex,
        kind: step.kind,
        applied: false,
        reason: "skipped (stepSkipIf)",
      });
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

/**
 * Minimal `WorkflowContext` for a mechanical step — nothing else reads
 * `dbKey`/`log`/agent fields. `workflowId` must be the real definition id
 * (not a preview placeholder): `runCopyStep` passes it into
 * `validateWorkflowAreas` / `updateWorkflowAreas`, which only touch areas
 * whose `FOR` list includes that id.
 */
function fileStepContext(
  state: WalkState,
  workflowId: string,
  stepIndex: number,
  cwd: string,
): WorkflowContext {
  return {
    runId: "preview",
    workflowId,
    stepIndex,
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

function remapRepoPathForPreview(state: WalkState, absPath: string): string {
  if (absPath === state.repoRoot || absPath.startsWith(state.repoRoot + path.sep)) {
    return path.join(state.scratchRoot, path.relative(state.repoRoot, absPath));
  }
  return absPath;
}

function remapCopyInputForPreview(state: WalkState, input: CopyStepInput): CopyStepInput {
  return {
    ...input,
    targetDir: remapRepoPathForPreview(state, input.targetDir),
  };
}

async function applyFileStep(
  state: WalkState,
  workflowId: string,
  stepIndex: number,
  kind: "copy" | "transform-file",
  stepInput: unknown,
  cwd: string,
): Promise<PreviewFileChange[]> {
  const effectiveInput =
    kind === "copy"
      ? remapCopyInputForPreview(state, stepInput as CopyStepInput)
      : stepInput;
  // Only the destinations this step will write — never the whole package
  // `targetDir` (vue/add-view's targetDir is the clients/ parent; materializing
  // that pulled fonts/images and made SPA previews take tens of seconds).
  const absTargets =
    kind === "copy"
      ? resolveCopyTargetPaths(effectiveInput as CopyStepInput)
      : [resolveTransformFilePath(stepInput as TransformFileStepInput, cwd)];

  const existingBlobHashes = materializePaths(state, absTargets);
  try {
    const ctx = fileStepContext(state, workflowId, stepIndex, cwd);
    const outcome =
      kind === "copy"
        ? await runCopyStep(effectiveInput as CopyStepInput, ctx)
        : await runTransformFileStep(stepInput as TransformFileStepInput, ctx);
    if (outcome.status !== "success") {
      throw new Error(
        outcome.status === "error"
          ? outcome.message
          : `Stopped with status ${outcome.status}`,
      );
    }

    if (kind === "copy") {
      const copied = (outcome.result as { copiedFiles?: Record<string, string> } | undefined)
        ?.copiedFiles;
      if (copied) {
        for (const [fileId, absScratchPath] of Object.entries(copied)) {
          const rel = toRepoRelative(state, absScratchPath);
          if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
            state.previewCopiedFiles[fileId] = path.join(state.repoRoot, rel);
          }
        }
      }
    }

    const writtenAbs =
      kind === "copy"
        ? Object.values(
            (outcome.result as { copiedFiles?: Record<string, string> } | undefined)
              ?.copiedFiles ?? {},
          )
        : absTargets;

    return await commitPaths(state, writtenAbs, existingBlobHashes);
  } finally {
    for (const abs of absTargets) {
      rmSync(abs, { force: true });
    }
  }
}

function resolveTransformFilePath(input: TransformFileStepInput, cwd: string): string {
  return input.filePath.startsWith("/") ? input.filePath : path.join(cwd, input.filePath);
}

function toRepoRelative(state: WalkState, absPath: string): string {
  return path.relative(state.scratchRoot, absPath).split(path.sep).join("/");
}

function packageJsonInPreviewTree(
  state: WalkState,
  repoRelativeDir: string,
): boolean {
  const normalized = repoRelativeDir.split(path.sep).join("/").replace(/\/$/, "");
  const relPath = normalized ? `${normalized}/package.json` : "package.json";
  const { result: entries, error } = listTree(state.repoRoot, state.currentHash, [relPath]);
  if (error) return false;
  return (entries?.length ?? 0) > 0;
}

/**
 * CD validation for preview/validate: honor the live repo, paths created by
 * earlier preview steps (in-memory commit), and pending copy targets — not
 * only what exists on disk right now.
 */
function validatePreviewCdStep(
  state: WalkState,
  nextCwd: string,
  _originalCwd: string,
  stepInput: CdStepInput,
): void {
  const repoRelative = path.relative(state.scratchRoot, nextCwd);
  if (repoRelative.startsWith("..") || path.isAbsolute(repoRelative)) {
    throw new Error(`CD target is outside the preview repo: ${stepInput.path}`);
  }
  const realCdTarget = path.join(state.repoRoot, repoRelative);

  if (existsSync(path.join(realCdTarget, "package.json"))) {
    return;
  }
  if (packageJsonInPreviewTree(state, repoRelative)) {
    return;
  }
  validateCdTarget(realCdTarget, "dry", state.previewCopiedFiles);
}

/**
 * Pulls only the given absolute scratch paths (that already exist in the
 * running commit) onto disk, returning each path's current blob hash.
 */
function materializePaths(state: WalkState, absPaths: string[]): Map<string, string> {
  const relPaths = [
    ...new Set(
      absPaths
        .map((abs) => toRepoRelative(state, abs))
        .filter((rel) => rel && !rel.startsWith("..") && !path.isAbsolute(rel)),
    ),
  ];
  if (relPaths.length === 0) return new Map();

  const { result: entries, error } = listTree(state.repoRoot, state.currentHash, relPaths);
  if (error) throw error;
  const entryByPath = new Map((entries ?? []).map((e) => [e.path, e]));

  const blobHashes = [...new Set((entries ?? []).map((e) => e.blobHash))];
  const { result: blobs, error: blobsError } =
    blobHashes.length > 0
      ? readBlobs(state.repoRoot, blobHashes)
      : { result: new Map<string, Buffer>(), error: undefined };
  if (blobsError) throw blobsError;

  for (const relPath of relPaths) {
    const dest = path.join(state.scratchRoot, relPath);
    mkdirSync(path.dirname(dest), { recursive: true });
    const onDisk = path.join(state.repoRoot, relPath);
    if (existsSync(onDisk)) {
      // Prefer the working tree so `validate` / dev-site preview match what
      // you see in the editor, not only what's committed at `baseHash`.
      writeFileSync(dest, readFileSync(onDisk), "utf-8");
      continue;
    }
    const entry = entryByPath.get(relPath);
    if (!entry) continue;
    const content = blobs!.get(entry.blobHash);
    if (content === undefined) continue;
    writeFileSync(dest, content, "utf-8");
  }

  return new Map((entries ?? []).map((e) => [e.path, e.blobHash]));
}

/** Hashes and stages only the written paths, then advances the running commit. */
async function commitPaths(
  state: WalkState,
  absPaths: string[],
  existingBlobHashes: Map<string, string>,
): Promise<PreviewFileChange[]> {
  const unique = [...new Set(absPaths)];
  const changes: PreviewFileChange[] = [];
  let staged = 0;

  for (const absFile of unique) {
    let stats: Stats;
    try {
      stats = statSync(absFile);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;

    const relPath = toRepoRelative(state, absFile);
    // Raw bytes — copy may write binaries via copyFile without transforming.
    const content = readFileSync(absFile);
    const { result: blobHash, error } = writeBlob(state.repoRoot, content);
    if (error) throw error;
    const { error: setError } = setIndexEntry(state.scratch, relPath, blobHash!);
    if (setError) throw setError;
    staged += 1;

    const existingBlobHash = existingBlobHashes.get(relPath);
    if (existingBlobHash === undefined) {
      changes.push({ path: relPath, status: "added" });
    } else if (existingBlobHash !== blobHash) {
      changes.push({ path: relPath, status: "modified" });
    }
  }

  if (staged === 0) return changes;

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
  return changes;
}
