import { describe, it, expect } from "vitest";
import { UpdateSpecWorkflowMachine } from "./update-spec.ts";
import { createActor, waitFor } from "xstate";
import { allSettled, continueWorkflow } from "../../workflows/src/utils.ts";

describe("update-spec", () => {
  it("should update the OpenAPI spec", async () => {
    const actor = createActor(UpdateSpecWorkflowMachine, {
      input: {
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
