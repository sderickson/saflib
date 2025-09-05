import { getSafReporters } from "@saflib/node";
import { addNewLinesToString } from "@saflib/utils";
import {
  type AnyMachineSnapshot,
  type AnyActor,
  type AnyActorRef,
} from "xstate";
import type { ChecklistItem, WorkflowContext, WorkflowInput } from "./types.ts";

export function allSettled(snapshot: AnyMachineSnapshot): boolean {
  if (snapshot.children) {
    const children = Object.values(snapshot.children) as AnyActor[];
    return children.every((child) => {
      return allSettled(child.getSnapshot());
    });
  }
  return snapshot.status !== "active";
}

export const print = (msg: string, noNewLine = false) => {
  const { log } = getSafReporters();
  if (!noNewLine) {
    log.info("");
  }
  log.info(addNewLinesToString(msg));
};

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
    loggedLast: false,
    systemPrompt: input.systemPrompt,
    dryRun: input.dryRun,
    rootRef: input.rootRef as AnyActorRef,
    templateFiles: input.templateFiles,
    copiedFiles: input.copiedFiles,
    docFiles: input.docFiles,
  };
}
