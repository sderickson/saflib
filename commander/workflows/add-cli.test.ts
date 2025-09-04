import { describe, it, expect } from "vitest";
import { AddCLIWorkflowMachine } from "./add-cli.ts";
import { createActor, waitFor } from "xstate";
import { allSettled, continueWorkflow } from "../../workflows/src/utils.ts";

describe("add-cli", () => {
  it("should create a new CLI", async () => {
    const actor = createActor(AddCLIWorkflowMachine, {
      input: {
        name: "test-cli",
        dryRun: true,
      },
    });
    actor.start();
    await waitFor(actor, allSettled);
    let lastStateName = "";
    while (actor.getSnapshot().status !== "done") {
      continueWorkflow(actor);
      await waitFor(actor, allSettled);
      const currentStateName = actor.getSnapshot().value;
      if (currentStateName === lastStateName) {
        throw new Error(`Workflow is stuck on state ${currentStateName}.`);
      }
      lastStateName = currentStateName;
    }
    expect(actor.getSnapshot().status).toBe("done");
  });
});
