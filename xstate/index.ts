/**
 * Convenience function for getting a machine to run until it stops running of its own accord,
 * but does not necessarily reach a terminal state.
 *
 * Usage:
 * ```ts
 *
 * import { createActor, waitFor } from "xstate";
 * import { allChildrenSettled } from "@saflib/xstate";
 *
 * const actor = createActor(machine);
 * actor.start();
 * await waitFor(actor, allChildrenSettled);
 */
export function allChildrenSettled(snapshot: any) {
  return Object.values(snapshot.children).every(
    (child: any) => child && child.getSnapshot().status !== "active",
  );
}
