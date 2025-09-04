import { describe, it, expect } from "vitest";
import { AddEnvVarWorkflowMachine } from "./add-env-var.ts";
import { createActor, waitFor } from "xstate";
import { allSettled, continueWorkflow } from "../../workflows/src/utils.ts";

describe("add-env-var", () => {
  it("should add a new environment variable", async () => {
    const actor = createActor(AddEnvVarWorkflowMachine, {
      input: {
        name: "TEST_ENV_VAR",
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
