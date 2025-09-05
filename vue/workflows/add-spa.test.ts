import { describe, it, expect } from "vitest";
import { AddSpaWorkflowMachine } from "./add-spa.ts";
import { createActor, waitFor } from "xstate";
import {
  workflowAllSettled,
  continueWorkflow,
} from "../../workflows/core/utils.ts";

describe("add-spa", () => {
  it("should create a new SPA", async () => {
    const actor = createActor(AddSpaWorkflowMachine, {
      input: {
        name: "test-spa",
        dryRun: true,
      },
    });
    actor.start();
    await waitFor(actor, workflowAllSettled);
    let lastStateName = "";
    while (actor.getSnapshot().status !== "done") {
      continueWorkflow(actor);
      await waitFor(actor, workflowAllSettled);
      const currentStateName = actor.getSnapshot().value;
      if (currentStateName === lastStateName) {
        throw new Error(`Workflow is stuck on state ${currentStateName}.`);
      }
      lastStateName = currentStateName;
    }
    expect(actor.getSnapshot().status).toBe("done");
  });
});
