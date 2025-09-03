import { describe, expect, it } from "vitest";
import { promptWorkflowMachine } from "./test-workflows.ts";
import { createActor, waitFor } from "xstate";
import { allSettled } from "../src/utils.ts";

describe("makeMachineFromWorkflow", () => {
  it("should create a machine from a workflow", async () => {
    expect(promptWorkflowMachine).toBeDefined();
    const actor = createActor(promptWorkflowMachine, {
      input: {
        prompt: "What is your name?",
        prompt2: "What is your favorite color?",
      },
    });
    actor.start();
    await waitFor(actor, allSettled);
  });
});
