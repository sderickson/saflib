import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createActor, waitFor } from "xstate";
import { updateTemplateComposer } from "./update-template-machine.ts";
import path from "node:path";
import { setup } from "xstate";
import { workflowActions, workflowActors } from "../xstate.ts";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import type { TemplateWorkflowContext } from "../types.ts";

interface TestContext extends TemplateWorkflowContext {
  testFile: string;
}

describe("updateTemplateFileFactory", () => {
  const testFilePath = path.join(process.cwd(), "test-file.txt");

  beforeEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  it("should continue to next state when file has no TODOs", async () => {
    writeFileSync(testFilePath, "This is a test file with no todos");

    const testMachine = setup({
      types: {
        context: {} as TestContext,
      },
      actions: workflowActions,
      actors: workflowActors,
    }).createMachine({
      id: "test",
      initial: "testState",
      context: {
        checklist: [],
        testFile: testFilePath,
        loggedLast: false,
        name: "test",
        pascalName: "Test",
        targetDir: testFilePath,
        sourceDir: testFilePath,
      },
      states: {
        ...updateTemplateComposer({
          filePath: "test-file.txt",
          promptMessage: "Please update the test file",
          stateName: "testState",
          nextStateName: "done",
        }),
        done: {
          type: "final",
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    actor.send({ type: "continue" });
    await waitFor(actor, (state) => state.matches("done"));

    expect(actor.getSnapshot().value).toBe("done");
  });

  it("should stay in current state when file has TODOs", async () => {
    writeFileSync(
      testFilePath,
      "This is a test file with // TODO: implement this",
    );

    const testMachine = setup({
      types: {
        context: {} as TestContext,
      },
      actions: workflowActions,
      actors: workflowActors,
    }).createMachine({
      id: "test",
      initial: "testState",
      context: {
        checklist: [],
        testFile: testFilePath,
        loggedLast: false,
        name: "test",
        pascalName: "Test",
        targetDir: testFilePath,
        sourceDir: testFilePath,
      },
      states: {
        ...updateTemplateComposer({
          filePath: "test-file.txt",
          promptMessage: "Please update the test file",
          stateName: "testState",
          nextStateName: "done",
        }),
        done: {
          type: "final",
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    actor.send({ type: "continue" });

    // Wait a bit to ensure the state machine has processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(actor.getSnapshot().value).toBe("testState");
  });

  it("should work with function-based filePath", async () => {
    writeFileSync(testFilePath, "This is a test file with no todos");

    const testMachine = setup({
      types: {
        context: {} as TestContext,
      },
      actions: workflowActions,
      actors: workflowActors,
    }).createMachine({
      id: "test",
      initial: "testState",
      context: {
        checklist: [],
        testFile: testFilePath,
        loggedLast: false,
        name: "test",
        pascalName: "Test",
        targetDir: testFilePath,
        sourceDir: testFilePath,
      },
      states: {
        ...updateTemplateComposer({
          filePath: (context: TestContext) => context.testFile,
          promptMessage: "Please update the test file",
          stateName: "testState",
          nextStateName: "done",
        }),
        done: {
          type: "final",
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    actor.send({ type: "continue" });
    await waitFor(actor, (state) => state.matches("done"));

    expect(actor.getSnapshot().value).toBe("done");
  });
});
