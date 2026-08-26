import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import path from "node:path";
import { pollingWaitFor } from "../utils.ts";
import { NpmScriptStepMachine, npmScriptToCommandInput } from "./npm-script.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");

describe("NpmScriptStepMachine", () => {
  it("completes in checklist mode for a valid workspace script", async () => {
    const actor = createActor(NpmScriptStepMachine, {
      input: {
        workspace: "@pathclerk/daemon-http",
        script: "test",
        args: ["whatsapp"],
        cwd: path.join(repoRoot, "daemon/plans"),
        originalWorkingDirectory: repoRoot,
        runMode: "checklist",
      },
    });
    actor.start();
    await pollingWaitFor(actor, (state) => state.matches("done"));
    expect(actor.getSnapshot().status).toBe("done");
    expect(actor.getSnapshot().output?.checklist.description).toContain(
      "@pathclerk/daemon-http",
    );
  });

  it("throws during startup for an unknown workspace in dry mode", () => {
    expect(() =>
      npmScriptToCommandInput({
        workspace: "@pathclerk/daemon-service-http",
        script: "test",
        cwd: repoRoot,
        runMode: "dry",
      }),
    ).toThrow(/workspace "@pathclerk\/daemon-service-http" not found/);
  });

  it("throws during startup for a missing script in dry mode", () => {
    expect(() =>
      npmScriptToCommandInput({
        workspace: "@pathclerk/daemon-http",
        script: "typoo",
        cwd: repoRoot,
        runMode: "dry",
      }),
    ).toThrow(/script "typoo" not found/);
  });
});
