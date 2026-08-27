import { afterEach, describe, expect, it } from "vitest";
import { createActor, type AnyActor } from "xstate";
import path from "node:path";
import { pollingWaitFor } from "../utils.ts";
import { NpmScriptStepMachine, npmScriptToCommandInput } from "./npm-script.ts";

const fixtureRoot = path.join(import.meta.dirname, "npm-script-fixtures");
const workspaceName = "@fixture/npm-script-child";

describe("NpmScriptStepMachine", () => {
  const actors: AnyActor[] = [];

  afterEach(() => {
    for (const actor of actors.splice(0)) {
      actor.stop();
    }
  });

  it("completes in checklist mode for a valid workspace script", async () => {
    const actor = createActor(NpmScriptStepMachine, {
      input: {
        workspace: workspaceName,
        script: "test",
        args: ["unit"],
        cwd: path.join(fixtureRoot, "packages/nested"),
        originalWorkingDirectory: fixtureRoot,
        runMode: "checklist",
      },
    });
    actors.push(actor);
    actor.start();
    await pollingWaitFor(actor, (state) => state.matches("done"));
    expect(actor.getSnapshot().status).toBe("done");
    expect(actor.getSnapshot().output?.checklist.description).toContain(
      workspaceName,
    );
  });

  it("throws during startup for an unknown workspace in dry mode", () => {
    expect(() =>
      npmScriptToCommandInput({
        workspace: "@fixture/npm-script-missing",
        script: "test",
        cwd: fixtureRoot,
        runMode: "dry",
      }),
    ).toThrow(/workspace "@fixture\/npm-script-missing" not found/);
  });

  it("throws during startup for a missing script in dry mode", () => {
    expect(() =>
      npmScriptToCommandInput({
        workspace: workspaceName,
        script: "typoo",
        cwd: fixtureRoot,
        runMode: "dry",
      }),
    ).toThrow(/script "typoo" not found/);
  });
});
