import { describe, it, expect } from "vitest";
import { AddRouteWorkflowMachine } from "./add-route.ts";
import { createActor, waitFor } from "xstate";
import { workflowAllSettled, continueWorkflow } from "@saflib/workflows";

describe("add-route", () => {
  it("should create a new route", async () => {
    const actor = createActor(AddRouteWorkflowMachine, {
      input: {
        path: "routes/test-feature/test-route.ts",
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
