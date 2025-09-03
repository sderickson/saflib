import { getSafReporters } from "@saflib/node";
import { addNewLinesToString } from "@saflib/utils";
import { type AnyMachineSnapshot, type AnyActor, waitFor } from "xstate";
import type { ChecklistItem } from "../index.ts";

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
  if (!snapshot.children) {
    actor.send({ type: "continue" });
    return;
  }
  Object.values(snapshot.children as Record<string, AnyActor>).forEach(
    (child) => {
      child.send({ type: "continue" });
      continueWorkflow(child);
    },
  );
};

export const printChecklistRecursively = (
  checklist: ChecklistItem[],
  prefix = "",
) => {
  checklist.forEach((item) => {
    console.log(`${prefix}* ${item.description}`);
    if (item.subitems) {
      printChecklistRecursively(item.subitems, `${prefix}  `);
    }
  });
};
