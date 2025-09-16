import { describe, it, expect } from "vitest";
import { DocStepMachine } from "./doc.ts";
import { createActor } from "xstate";
import { pollingWaitFor } from "../utils.ts";

describe("DocStepMachine", () => {
  it("should review a document in dry run mode", async () => {
    const actor = createActor(DocStepMachine, {
      input: {
        docId: "test-doc",
        docFiles: {
          "test-doc": "/path/to/test-doc.md",
        },
        runMode: "dry",
      },
    });
    actor.start();
    await pollingWaitFor(actor, (state) => state.matches("done"));
    expect(actor.getSnapshot().status).toBe("done");
  });
});
