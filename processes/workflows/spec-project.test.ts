import { describe, it, expect } from "vitest";
import { SpecProjectWorkflowMachine } from "./spec-project.ts";
import { createActor, waitFor } from "xstate";
import { allSettled, continueWorkflow } from "../../workflows/src/utils.ts";

describe("spec-project", () => {
  it("should create a new spec project", async () => {
    const actor = createActor(SpecProjectWorkflowMachine, {
      input: {
        name: "test-project",
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
