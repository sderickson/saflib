import { describe, expect, it } from "vitest";
import { promptWorkflowMachine } from "./test-workflows.ts";
import { createActor, waitFor, type AnyActor } from "xstate";
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
    expect(actor.getSnapshot().value).toBe("step_0");
    const snapshot = actor.getSnapshot();
    Object.values(snapshot.children as Record<string, AnyActor>).forEach(
      (child) => {
        child.send({ type: "continue" });
      },
    );
    await waitFor(actor, allSettled);
    expect(actor.getSnapshot().value).toBe("step_1");
    const snapshot2 = actor.getSnapshot();
    Object.values(snapshot2.children as Record<string, AnyActor>).forEach(
      (child) => {
        child.send({ type: "continue" });
      },
    );
    await waitFor(actor, allSettled);
    expect(actor.getSnapshot().value).toBe("step_2");
  });
});
