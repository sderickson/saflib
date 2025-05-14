import { AddTestsWorkflowMachine } from "./add-tests-xstate.ts";
import { createActor, waitFor } from "xstate";
import { describe, it, expect } from "vitest";
import { allChildrenSettled } from "./xstate-shared.ts";

describe("AddTestsWorkflow", () => {
  it("should print instructions", async () => {
    const actor = createActor(AddTestsWorkflowMachine, {
      input: { path: "sample/add-tests-xstate.ts" },
    });
    actor.start();
    console.log("all good?", actor.getSnapshot().status);
    console.log(actor.getSnapshot());
    await waitFor(actor, allChildrenSettled);
    expect(actor.getSnapshot().value).toBe("addingTests");
    actor.send({ type: "continue" });
    await waitFor(actor, allChildrenSettled);
    expect(actor.getSnapshot().value).toBe("done");
  });
});
