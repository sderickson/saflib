import { describe, it, expect } from "vitest";
import {
  CommandStepMachine,
  isScriptModeValidationCommand,
} from "./command.ts";
import { createActor } from "xstate";
import { pollingWaitFor } from "../utils.ts";

describe("isScriptModeValidationCommand", () => {
  it("treats npm run typecheck/test as validation", () => {
    expect(isScriptModeValidationCommand("npm", ["run", "typecheck"])).toBe(
      true,
    );
    expect(isScriptModeValidationCommand("npm", ["run", "test"])).toBe(true);
    expect(isScriptModeValidationCommand("npm", ["run", "test:e2e"])).toBe(
      true,
    );
    expect(isScriptModeValidationCommand("npm", ["install"])).toBe(false);
    expect(
      isScriptModeValidationCommand("npm", ["exec", "saf-specs", "generate"]),
    ).toBe(false);
  });

  it("treats npx tsc as validation", () => {
    expect(isScriptModeValidationCommand("npx", ["tsc", "--noEmit"])).toBe(
      true,
    );
  });
});

describe("CommandStepMachine", () => {
  it("should run a command in dry run mode", async () => {
    const actor = createActor(CommandStepMachine, {
      input: {
        command: "echo",
        args: ["hello", "world"],
        runMode: "checklist",
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
        runMode: "checklist",
      },
    });
    actor.start();
    await pollingWaitFor(actor, (state) => state.matches("done"));
    expect(actor.getSnapshot().status).toBe("done");
  });

  it("skips validation commands in script mode unless forceInScript", async () => {
    const skipped = createActor(CommandStepMachine, {
      input: {
        command: "npm",
        args: ["run", "typecheck"],
        runMode: "script",
      },
    });
    skipped.start();
    await pollingWaitFor(skipped, (state) => state.matches("done"));
    expect(skipped.getSnapshot().status).toBe("done");

    const forced = createActor(CommandStepMachine, {
      input: {
        command: "echo",
        args: ["forced"],
        runMode: "script",
        forceInScript: true,
      },
    });
    forced.start();
    await pollingWaitFor(forced, (state) => state.matches("done"));
    expect(forced.getSnapshot().status).toBe("done");
  });
});
