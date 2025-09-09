import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createActor } from "xstate";
import { UpdateStepMachine } from "./update-template-machine.ts";
import path from "node:path";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { pollingWaitFor, workflowAllSettled } from "../../utils.ts";

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
    const actor = createActor(UpdateStepMachine, {
      input: {
        fileId: "test-file.txt",
        promptMessage: "Update the test file",
        copiedFiles: {
          "test-file.txt": testFilePath,
        },
      },
    });
    actor.start();
    await pollingWaitFor(actor, workflowAllSettled);
    expect(actor.getSnapshot().value).toBe("update");
    actor.send({ type: "continue" });
    await pollingWaitFor(actor, workflowAllSettled);
    expect(actor.getSnapshot().value).toBe("done");
  });

  it("should stay in current state when file has TODOs", async () => {
    writeFileSync(
      testFilePath,
      "This is a test file with // TODO: implement this",
    );

    const actor = createActor(UpdateStepMachine, {
      input: {
        fileId: "test-file.txt",
        promptMessage: "Update the test file",
        copiedFiles: {
          "test-file.txt": testFilePath,
        },
      },
    });
    actor.start();

    actor.send({ type: "continue" });

    // Wait a bit to ensure the state machine has processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(actor.getSnapshot().value).toBe("update");
    actor.send({ type: "continue" });
    await pollingWaitFor(actor, workflowAllSettled);
    expect(actor.getSnapshot().value).toBe("update");
  });
});
