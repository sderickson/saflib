import path from "node:path";
import { addNewLinesToString } from "../strings.ts";
import { type AnyMachineSnapshot, type AnyActor } from "xstate";
import type { ChecklistItem, WorkflowContext, WorkflowInput } from "./types.ts";
import { getWorkflowLogger } from "./store.ts";

/** Format an absolute path for logs/checklists relative to a workflow cwd. */
export function formatPathForDisplay(
  filePath: string,
  baseCwd: string,
): string {
  if (!path.isAbsolute(filePath)) return filePath;
  const rel = path.relative(baseCwd, filePath);
  if (rel === "") return ".";
  return rel;
}

/** Format a shell command for logs/checklists (relativize absolute path args). */
export function formatCommandForDisplay(
  command: string,
  args: string[],
  baseCwd: string,
): string {
  const displayArgs = args.map((arg) =>
    path.isAbsolute(arg) ? formatPathForDisplay(arg, baseCwd) : arg,
  );
  return `${command} ${displayArgs.join(" ")}`.trim();
}

/**
 * Convenience function. Use with xstate's `waitFor` to wait for the workflow to halt, because it has prompted the agent to do something.
 * 
 * ```ts
 * import { createActor } from "xstate";
 * import { workflowAllSettled, pollingWaitFor } from "@saflib/workflows";
 * const actor = createActor(WorkflowMachine, {
      input: { /* ... *\/ },
    });
    actor.start();
    await pollingWaitFor(actor, workflowAllSettled);
 * ```
 */
export function workflowAllSettled(snapshot: AnyMachineSnapshot): boolean {
  if (snapshot.children) {
    const children = Object.values(snapshot.children) as AnyActor[];
    return children.every((child) => {
      return workflowAllSettled(child.getSnapshot());
    });
  }
  return snapshot.status !== "active";
}

interface PrintOptions {}

export const print = (msg: string, _: PrintOptions = {}) => {
  console.log(addNewLinesToString(msg));
};

export const promptWorkflow = (actor: AnyActor) => {
  const snapshot = actor.getSnapshot();
  if (actor.getSnapshot().status === "active") {
    actor.send({ type: "prompt" });
  }
  if (!snapshot.children) {
    return;
  }
  Object.values(snapshot.children as Record<string, AnyActor>).forEach(
    (child) => {
      promptWorkflow(child);
    },
  );
};

/**
 * Convenience function to continue a workflow which has halted because a prompt was shown. Signals every active actor to "continue".
 */
export const continueWorkflow = (actor: AnyActor) => {
  const logger = getWorkflowLogger();
  const activeActors = getActiveActors(actor);
  if (!activeActors.length) {
    throw new Error("No active actors found, could not continue workflow");
  }
  const lastActor = activeActors[activeActors.length - 1];
  logger.info(`Continuing workflow with actor ${lastActor.id}`);
  lastActor.send({ type: "continue" });
};

const getActiveActors = (actor: AnyActor): AnyActor[] => {
  let activeActors: AnyActor[] = [];
  if (actor.getSnapshot().status === "active") {
    activeActors.push(actor);
  }
  const children = actor.getSnapshot().children as Record<string, AnyActor>;
  if (!children) {
    return activeActors;
  }
  Object.values(children).forEach((child) => {
    activeActors = [...activeActors, ...getActiveActors(child)];
  });
  return activeActors;
};

/**
 * Convenience function to convert a checklist to a string.
 *
 * This is mainly useful on the runWorkflow's `output` return value.
 */
export const checklistToString = (
  checklist: ChecklistItem[],
  prefix = "",
): string => {
  return checklist
    .map((item) => {
      const lines = [`${prefix}* ${item.description}`];
      if (item.subitems) {
        lines.push(checklistToString(item.subitems, `${prefix}  `));
      }
      return lines;
    })
    .flat()
    .join("\n");
};

export function contextFromInput(input: WorkflowInput): WorkflowContext {
  return {
    workflowId: input.workflowId || "not-provided",
    checklist: [],
    prompt: input.prompt,
    runMode: input.runMode || "print",
    templateFiles: input.templateFiles,
    copiedFiles: input.copiedFiles,
    docFiles: input.docFiles,
    cwd: input.cwd || process.cwd(),
    originalWorkingDirectory: input.cwd || process.cwd(),
    agentConfig: input.agentConfig,
    skipTodos: input.skipTodos,
    manageVersionControl: input.manageVersionControl,
  };
}

export const pollingWaitFor = (
  actor: AnyActor,
  condition: (snapshot: AnyMachineSnapshot) => boolean,
  options?: { intervalMs?: number; timeoutMs?: number },
) => {
  const intervalMs = options?.intervalMs ?? 10;
  // Default 30s for unit tests; long script/CI runs must pass timeoutMs explicitly
  // (or use Infinity). `0` / `Infinity` disable the deadline.
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const hasDeadline = Number.isFinite(timeoutMs) && timeoutMs > 0;

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      try {
        const snapshot = actor.getSnapshot();
        if (condition(snapshot)) {
          clearInterval(interval);
          resolve(snapshot);
          return;
        }
        if (snapshot.status === "error") {
          clearInterval(interval);
          reject(snapshot.error ?? new Error("Actor entered error state"));
          return;
        }
        if (hasDeadline && Date.now() - startedAt > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`pollingWaitFor timed out after ${timeoutMs}ms`));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, intervalMs);
  });
};
