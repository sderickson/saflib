import { describe, expect, it } from "vitest";
import { pm } from "./types.ts";
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
    console.log(actor.getSnapshot());
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(actor.getSnapshot());
    // await waitFor(actor, allChildrenSettled);
  });
});
