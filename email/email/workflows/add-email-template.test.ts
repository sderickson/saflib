import { describe, it, expect } from "vitest";
import { AddEmailTemplateWorkflowMachine } from "./add-email-template.ts";
import { createActor, waitFor } from "xstate";
import { workflowAllSettled, continueWorkflow } from "@saflib/workflows";

describe("add-email-template", () => {
  it("should create a new email template", async () => {
    const actor = createActor(AddEmailTemplateWorkflowMachine, {
      input: {
        path: "./email-templates/test-template.ts",
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
