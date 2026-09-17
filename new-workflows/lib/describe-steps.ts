import type { WorkflowDefinition } from "./types.ts";

export interface WorkflowRunStepDescription {
  index: number;
  kind: string;
  label?: string;
  /**
   * Key/value breakdown of this step's own input fields — e.g. a
   * `call-workflow` step's `targetInput` — for a detail list in the UI
   * instead of cramming everything into `label`'s single line.
   */
  params?: Record<string, string>;
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
    let params: Record<string, string> | undefined;
    try {
      const input = step.input({ context: {} });
      label = summarizeStepInput(step.kind, input);
      params = describeStepParams(step.kind, input);
    } catch {
      label = undefined;
    }
    return { index, kind: step.kind, label, params };
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
      // Just the target id — no "call-workflow:" prefix, no inlined
      // targetInput JSON. A nested call's own params are numerous enough
      // (and the sidebar column narrow enough) that cramming them into
      // this one line made the label unreadable; see `describeStepParams`
      // for where they now go instead.
      const target = obj.targetDefinition as { id?: string } | undefined;
      return target?.id;
    }
    case "copy":
      return typeof obj.name === "string" ? `copy: ${obj.name}` : undefined;
    default:
      return undefined;
  }
}

/**
 * A step's own input fields as a flat key/value string map, for a sidebar
 * detail list (one `<li>key: value</li>` per entry) instead of `label`'s
 * single truncated line. `undefined` (rather than `{}`) when there's
 * nothing worth listing, so the UI can skip rendering an empty list.
 */
export function describeStepParams(
  kind: string,
  input: unknown,
): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  const params: Record<string, string> = {};

  switch (kind) {
    case "cd":
      if (typeof obj.path === "string") params.path = obj.path;
      break;
    case "command":
    case "npm-script":
      if (typeof obj.command === "string") params.command = obj.command;
      if (typeof obj.script === "string") params.script = obj.script;
      if (typeof obj.workspace === "string") params.workspace = obj.workspace;
      if (Array.isArray(obj.args) && obj.args.length > 0) params.args = obj.args.join(" ");
      break;
    case "prompt":
      if (typeof obj.prompt === "string") params.prompt = obj.prompt;
      break;
    case "update":
      if (typeof obj.fileId === "string") params.fileId = obj.fileId;
      if (typeof obj.prompt === "string") params.prompt = obj.prompt;
      break;
    case "copy":
      if (typeof obj.name === "string") params.name = obj.name;
      break;
    case "call-workflow": {
      const targetInput = obj.targetInput;
      if (targetInput && typeof targetInput === "object") {
        for (const [key, value] of Object.entries(targetInput as Record<string, unknown>)) {
          params[key] = typeof value === "string" ? value : JSON.stringify(value);
        }
      }
      break;
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}
