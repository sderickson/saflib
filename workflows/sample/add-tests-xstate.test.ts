import { AddTestsWorkflow } from "./add-tests-xstate.ts";
import { createActor, waitFor } from "xstate";
import { describe, it, expect } from "vitest";

export function allChildrenSettled(snapshot: any) {
  return Object.values(snapshot.children).every(
    (child: any) => child && child.getSnapshot().status !== "active",
  );
}

describe("AddTestsWorkflow", () => {
  it("should print instructions", async () => {
    const actor = createActor(AddTestsWorkflow, {
      input: { path: "sample/add-tests-xstate.ts" },
    });
    actor.start();
    console.log("all good?");
    console.log(actor.getSnapshot());
    await waitFor(actor, allChildrenSettled);
    expect(actor.getSnapshot().value).toBe("addingTests");
    actor.send({ type: "continue" });
    await waitFor(actor, allChildrenSettled);
    expect(actor.getSnapshot().value).toBe("done");
  });
});
