import { addNewLinesToString } from "../strings.ts";
import { type AnyMachineSnapshot, type AnyActor } from "xstate";
import type { ChecklistItem, WorkflowContext, WorkflowInput } from "./types.ts";

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
  const snapshot = actor.getSnapshot();
  if (actor.getSnapshot().status === "active") {
    actor.send({ type: "continue" });
  }
  if (!snapshot.children) {
    return;
  }
  Object.values(snapshot.children as Record<string, AnyActor>).forEach(
    (child) => {
      continueWorkflow(child);
    },
  );
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
    checklist: [],
    prompt: input.prompt,
    runMode: input.runMode || "print",
    templateFiles: input.templateFiles,
    copiedFiles: input.copiedFiles,
    docFiles: input.docFiles,
    cwd: input.cwd || process.cwd(),
    agentConfig: input.agentConfig,
    skipTodos: input.skipTodos,
    manageVersionControl: input.manageVersionControl,
  };
}

let timeout: NodeJS.Timeout | undefined;

/**
 * A hack to wait for workflows to halt. Periodically checks an actor based on a condition; used by runWorkflow.
 * @internal
 */
export const pollingWaitFor = (
  actor: AnyActor,
  condition: (snapshot: AnyMachineSnapshot) => boolean,
) => {
  let resolve: (value: any) => void;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
  });
  timeout = setInterval(() => {
    if (condition(actor.getSnapshot())) {
      clearInterval(timeout);
      resolve(actor.getSnapshot());
    }
  }, 10);

  return promise;
};
