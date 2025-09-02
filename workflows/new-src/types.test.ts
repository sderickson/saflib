import { describe, expect, it } from "vitest";
import { makeMachineFromWorkflow, justPromptWorkflow, pm } from "./types.ts";
import { createActor, waitFor } from "xstate";
import { allChildrenSettled } from "../src/utils.ts";

describe("makeMachineFromWorkflow", () => {
  it("should create a machine from a workflow", async () => {
    const machine = pm;
    expect(machine).toBeDefined();
    const actor = createActor(machine, {
      input: {
        prompt: "What is your name?",
        prompt2: "What is your favorite color?",
      },
    });
    actor.start();
    // await waitFor(actor, allChildrenSettled);
    console.log(actor.getSnapshot());
    // expect(actor.getSnapshot().value).toBe("done");
  });
});
