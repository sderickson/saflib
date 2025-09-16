import { describe, it, expect } from "vitest";
import { CommandStepMachine } from "./command.ts";
import { createActor } from "xstate";
import { pollingWaitFor } from "../utils.ts";

describe("CommandStepMachine", () => {
  it("should run a command in dry run mode", async () => {
    const actor = createActor(CommandStepMachine, {
      input: {
        command: "echo",
        args: ["hello", "world"],
        runMode: "dry",
      },
    });
    actor.start();
    await pollingWaitFor(actor, (state) => state.matches("done"));
    expect(actor.getSnapshot().status).toBe("done");
  });

  it("should run a simple echo command", async () => {
    const actor = createActor(CommandStepMachine, {
      input: {
        command: "echo",
        args: ["test"],
        runMode: "print",
      },
    });
    actor.start();
    await pollingWaitFor(actor, (state) => state.matches("done"));
    expect(actor.getSnapshot().status).toBe("done");
  });

  it("should handle command without args", async () => {
    const actor = createActor(CommandStepMachine, {
      input: {
        command: "pwd",
        runMode: "dry",
      },
    });
    actor.start();
    await pollingWaitFor(actor, (state) => state.matches("done"));
    expect(actor.getSnapshot().status).toBe("done");
  });
});
