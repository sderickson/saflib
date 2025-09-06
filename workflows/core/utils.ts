import { addNewLinesToString } from "../strings.ts";
import {
  type AnyMachineSnapshot,
  type AnyActor,
  type AnyActorRef,
} from "xstate";
import type { ChecklistItem, WorkflowContext, WorkflowInput } from "./types.ts";

/**
 * Convenience function. Use with xstate's `waitFor` to wait for the workflow to halt, because it has prompted the agent to do something.
 * 
 * ```ts
 * import { createActor, waitFor } from "xstate";
 * import { workflowAllSettled } from "@saflib/workflows";
 * const actor = createActor(WorkflowMachine, {
      input: { /* ... *\/ },
    });
    actor.start();
    await waitFor(actor, workflowAllSettled);
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
      if (child.getSnapshot().status === "active") {
        child.send({ type: "continue" });
      }
      continueWorkflow(child);
    },
  );
};

/**
 * Convenience function to convert a checklist to a string. Checklist items are in markdown, so
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
    systemPrompt: input.systemPrompt,
    dryRun: input.dryRun,
    rootRef: input.rootRef as AnyActorRef,
    templateFiles: input.templateFiles,
    copiedFiles: input.copiedFiles,
    docFiles: input.docFiles,
  };
}
