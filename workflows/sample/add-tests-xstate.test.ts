import { AddTestsWorkflow } from "./add-tests-xstate.ts";
import { createActor } from "xstate";
import { describe, it, expect } from "vitest";
describe("AddTestsWorkflow", () => {
  it("should be defined", () => {
    expect(AddTestsWorkflow).toBeDefined();
  });

  it("should print instructions", () => {
    const actor = createActor(AddTestsWorkflow, {
      input: { path: "sample/add-tests-xstate.ts" },
    });
    actor.start();
    expect(actor.getSnapshot().value).toBe("validatingTests");
  });
});
