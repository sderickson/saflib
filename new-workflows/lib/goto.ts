import type { DbKey } from "@saflib/new-workflows-db";
import {
  getByIdWorkflowRun,
  getChildByParentStepWorkflowRun,
  updateStatusAndStepWorkflowRun,
  deleteFromStepWorkflowStep,
  WorkflowRunNotFoundError,
} from "@saflib/new-workflows-db";
import { describeWorkflowSteps } from "./describe-steps.ts";
import { loadWorkflowDefinition } from "./load-definition.ts";
import type { WorkflowDefinition } from "./types.ts";

export class GotoPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GotoPathError";
  }
}

export interface StepTreeNode {
  /** Slash-separated path from the root, e.g. `"2/4"`. */
  path: string;
  index: number;
  kind: string;
  label?: string;
  /** True when this node is on the active breadcrumb (current step at some nesting level). */
  isCurrent: boolean;
  /**
   * Run that owns this step, when one exists. Nested children under a
   * `call-workflow` that hasn't been entered yet have no run — go-to into
   * those paths fails until the parent step has created the child.
   */
  runId?: string;
  children?: StepTreeNode[];
}

export interface GotoRunStepResult {
  rootRunId: string;
  path: number[];
  leafRunId: string;
  leafStepIndex: number;
}

export function parseGotoPath(pathArg: string): number[] {
  const trimmed = pathArg.trim();
  if (!trimmed) {
    throw new GotoPathError("Path is empty.");
  }
  const parts = trimmed.split("/");
  const indices: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      throw new GotoPathError(
        `Invalid path segment "${part}" in "${pathArg}". Use slash-separated step indices (e.g. 2/4).`,
      );
    }
    indices.push(Number(part));
  }
  return indices;
}

export function formatGotoPath(path: number[]): string {
  return path.join("/");
}

/**
 * Indented tree of every step under a root run, including nested
 * `call-workflow` definitions (even before a child run exists). Shared by
 * the CLI listing, HTTP step-tree route, and the RunView modal.
 */
export async function buildStepTree(
  dbKey: DbKey,
  rootRunId: string,
  registry: WorkflowDefinition<any, any>[],
  opts: { cwd?: string } = {},
): Promise<StepTreeNode[]> {
  const { result: root, error } = await getByIdWorkflowRun(dbKey, { id: rootRunId });
  if (error) {
    if (error instanceof WorkflowRunNotFoundError) {
      throw new GotoPathError(`Run ${rootRunId} not found.`);
    }
    throw error;
  }

  const currentPath = await collectCurrentPath(dbKey, root.id);
  const definition = await loadWorkflowDefinition(root.workflow_ref, registry, {
    cwd: opts.cwd ?? root.cwd,
  });

  return buildNodesForRun(dbKey, {
    runId: root.id,
    definition,
    pathPrefix: [],
    currentPath,
    cwd: opts.cwd ?? root.cwd,
  });
}

/**
 * Seek the root run (and nested children along `path`) so the next
 * `advance` resumes at that step. Invalidates leaf step attempts from the
 * target index onward so retries aren't false resumes.
 */
export async function gotoRunStep(
  dbKey: DbKey,
  rootRunId: string,
  path: number[],
  registry: WorkflowDefinition<any, any>[],
  opts: { cwd?: string } = {},
): Promise<GotoRunStepResult> {
  if (path.length === 0) {
    throw new GotoPathError("Path must include at least one step index.");
  }

  const { result: root, error } = await getByIdWorkflowRun(dbKey, { id: rootRunId });
  if (error) {
    if (error instanceof WorkflowRunNotFoundError) {
      throw new GotoPathError(`Run ${rootRunId} not found.`);
    }
    throw error;
  }

  const cwd = opts.cwd ?? root.cwd;
  const now = new Date();

  // Walk the chain, validating each segment and resolving runs.
  type ChainEntry = {
    runId: string;
    definition: WorkflowDefinition<any, any>;
    stepIndex: number;
  };
  const chain: ChainEntry[] = [];

  let runId = root.id;
  let definition = await loadWorkflowDefinition(root.workflow_ref, registry, { cwd });

  for (let depth = 0; depth < path.length; depth++) {
    const stepIndex = path[depth]!;
    if (stepIndex < 0 || stepIndex >= definition.steps.length) {
      throw new GotoPathError(
        `Step index ${stepIndex} is out of range for ${definition.id} (0–${definition.steps.length - 1}).`,
      );
    }

    chain.push({ runId, definition, stepIndex });

    if (depth === path.length - 1) break;

    const step = definition.steps[stepIndex]!;
    if (step.kind !== "call-workflow") {
      throw new GotoPathError(
        `Path ${formatGotoPath(path.slice(0, depth + 1))} is a ${step.kind} step, not call-workflow — cannot descend further.`,
      );
    }

    const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: stepIndex,
    });
    if (!child) {
      throw new GotoPathError(
        `No nested run yet for path ${formatGotoPath(path.slice(0, depth + 1))}. ` +
          `Advance into that call-workflow step first, then go-to a child step.`,
      );
    }

    const nested = resolveCallWorkflowTarget(definition, stepIndex);
    if (!nested) {
      throw new GotoPathError(
        `Could not resolve nested workflow definition at path ${formatGotoPath(path.slice(0, depth + 1))}.`,
      );
    }

    runId = child.id;
    definition = nested;
  }

  // Park every ancestor on the segment that leads toward the leaf.
  for (let i = 0; i < chain.length - 1; i++) {
    const entry = chain[i]!;
    const { error: parkError } = await updateStatusAndStepWorkflowRun(dbKey, {
      id: entry.runId,
      status: "pending",
      current_step_index: entry.stepIndex,
      completion_hash: null,
      now,
    });
    if (parkError) throw parkError;
  }

  // Seek + invalidate the leaf.
  const leaf = chain[chain.length - 1]!;
  const { error: seekError } = await updateStatusAndStepWorkflowRun(dbKey, {
    id: leaf.runId,
    status: "pending",
    current_step_index: leaf.stepIndex,
    completion_hash: null,
    now,
  });
  if (seekError) throw seekError;

  const { error: deleteError } = await deleteFromStepWorkflowStep(dbKey, {
    run_id: leaf.runId,
    from_step_index: leaf.stepIndex,
  });
  if (deleteError) throw deleteError;

  return {
    rootRunId,
    path,
    leafRunId: leaf.runId,
    leafStepIndex: leaf.stepIndex,
  };
}

/** Active breadcrumb as a path of step indices from the root. */
async function collectCurrentPath(dbKey: DbKey, rootRunId: string): Promise<number[]> {
  const path: number[] = [];
  let runId = rootRunId;
  while (true) {
    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    if (!run) break;
    path.push(run.current_step_index);
    const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: run.id,
      parent_step_index: run.current_step_index,
    });
    if (!child) break;
    runId = child.id;
  }
  return path;
}

/** True when `prefix` is the current leaf or an ancestor on the breadcrumb. */
function isOnCurrentPath(prefix: number[], currentPath: number[]): boolean {
  return (
    prefix.length <= currentPath.length &&
    prefix.every((v, i) => v === currentPath[i])
  );
}

async function buildNodesForRun(
  dbKey: DbKey,
  args: {
    runId: string;
    definition: WorkflowDefinition<any, any>;
    pathPrefix: number[];
    currentPath: number[];
    cwd: string;
  },
): Promise<StepTreeNode[]> {
  const descriptions = describeWorkflowSteps(args.definition);
  const nodes: StepTreeNode[] = [];

  for (const desc of descriptions) {
    const path = [...args.pathPrefix, desc.index];
    const node: StepTreeNode = {
      path: formatGotoPath(path),
      index: desc.index,
      kind: desc.kind,
      label: desc.label,
      isCurrent: isOnCurrentPath(path, args.currentPath),
      runId: args.runId,
    };

    if (desc.kind === "call-workflow") {
      const nestedDef = resolveCallWorkflowTarget(args.definition, desc.index);
      const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
        parent_run_id: args.runId,
        parent_step_index: desc.index,
      });

      if (nestedDef) {
        if (child) {
          node.children = await buildNodesForRun(dbKey, {
            runId: child.id,
            definition: nestedDef,
            pathPrefix: path,
            currentPath: args.currentPath,
            cwd: args.cwd,
          });
        } else {
          // Show the nested outline even before a child run exists — rows
          // have no runId so the UI/CLI can still display structure.
          node.children = describeWorkflowSteps(nestedDef).map((childDesc) => {
            const childPath = [...path, childDesc.index];
            return {
              path: formatGotoPath(childPath),
              index: childDesc.index,
              kind: childDesc.kind,
              label: childDesc.label,
              isCurrent: false,
            } satisfies StepTreeNode;
          });
        }
      }
    }

    nodes.push(node);
  }

  return nodes;
}

/**
 * Best-effort: call `input()` with an empty context the same way
 * `describeWorkflowSteps` does, and pull `targetDefinition` off the result.
 */
function resolveCallWorkflowTarget(
  definition: WorkflowDefinition<any, any>,
  stepIndex: number,
): WorkflowDefinition<any, any> | undefined {
  const step = definition.steps[stepIndex];
  if (!step || step.kind !== "call-workflow") return undefined;
  try {
    const input = step.input({ context: {} }) as {
      targetDefinition?: WorkflowDefinition<any, any>;
    };
    return input.targetDefinition;
  } catch {
    return undefined;
  }
}

/** Pretty-print a step tree for the CLI. */
export function formatStepTree(nodes: StepTreeNode[], indent = 0): string {
  const lines: string[] = [];
  for (const node of nodes) {
    const pad = "  ".repeat(indent);
    const marker = node.isCurrent ? " ←" : "";
    const label = node.label ? ` — ${node.label}` : "";
    lines.push(`${pad}${node.path}  ${node.kind}${label}${marker}`);
    if (node.children?.length) {
      lines.push(formatStepTree(node.children, indent + 1));
    }
  }
  return lines.join("\n");
}
