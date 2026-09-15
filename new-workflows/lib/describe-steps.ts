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

function summarizeStepInput(kind: string, input: unknown): string | undefined {
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
      return target?.id ? `call-workflow: ${target.id}` : undefined;
    }
    case "copy":
      return typeof obj.name === "string" ? `copy: ${obj.name}` : undefined;
    default:
      return undefined;
  }
}
