import type { WorkflowDefinition } from "./types.ts";

export interface WorkflowRunStepDescription {
  index: number;
  kind: string;
  label?: string;
}

/**
 * Best-effort label per step, for an outline/sidebar view (http's
 * `getWorkflowRunSteps` route). Calls each step's `input()` with an empty
 * `{}` context — safe for config-defined workflows (whose `input`
 * closures ignore `ctx.context` and just echo the config step's own
 * fields) but not guaranteed for code workflows that read real context
 * fields built up over prior steps, so any throw just falls back to the
 * bare `kind` rather than failing the whole list.
 */
export function describeWorkflowSteps(
  definition: WorkflowDefinition<any, any>,
): WorkflowRunStepDescription[] {
  return definition.steps.map((step, index) => {
    let label: string | undefined;
    try {
      const input = step.input({ context: {} });
      label = summarizeStepInput(step.kind, input);
    } catch {
      label = undefined;
    }
    return { index, kind: step.kind, label };
  });
}

function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Exported so `engine.ts` can build a git commit message from a step's
 * *real* rendered input (not the empty-context best-effort guess
 * `describeWorkflowSteps` uses for the sidebar).
 */
export function summarizeStepInput(kind: string, input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  switch (kind) {
    case "cd":
      return typeof obj.path === "string" ? `cd ${obj.path}` : undefined;
    case "command": {
      if (typeof obj.command !== "string") return undefined;
      const args = Array.isArray(obj.args) ? obj.args.join(" ") : "";
      return truncate([obj.command, args].filter(Boolean).join(" "));
    }
    case "npm-script":
      return typeof obj.script === "string" ? `npm run ${obj.script}` : undefined;
    case "prompt":
      return typeof obj.prompt === "string" ? truncate(obj.prompt) : undefined;
    case "update":
      return typeof obj.fileId === "string" ? `update: ${obj.fileId}` : undefined;
    case "call-workflow": {
      const target = obj.targetDefinition as { id?: string } | undefined;
      if (!target?.id) return undefined;
      // Config-compiled `call-workflow` steps' `targetInput` is a closure
      // over the config file's own step body (see `compile.ts`), not
      // context-dependent — safe (and important) to show here, e.g. so a
      // "did my edit to this step's `path` actually take" question can be
      // answered by just looking at the sidebar instead of guessing.
      const targetInput = obj.targetInput;
      const hasTargetInput =
        targetInput && typeof targetInput === "object" && Object.keys(targetInput).length > 0;
      return hasTargetInput
        ? `call-workflow: ${target.id} ${truncate(JSON.stringify(targetInput))}`
        : `call-workflow: ${target.id}`;
    }
    case "copy":
      return typeof obj.name === "string" ? `copy: ${obj.name}` : undefined;
    default:
      return undefined;
  }
}
