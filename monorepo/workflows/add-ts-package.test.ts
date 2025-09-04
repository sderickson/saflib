import { describe, it, expect } from "vitest";
import { AddTsPackageWorkflowMachine } from "./add-ts-package.ts";
import { createActor, waitFor } from "xstate";
import { allSettled, continueWorkflow } from "../../workflows/src/utils.ts";

describe("add-ts-package", () => {
  it("should create a new TypeScript package", async () => {
    const actor = createActor(AddTsPackageWorkflowMachine, {
      input: {
        name: "@test-org/test-package",
        path: "packages/test-package",
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
