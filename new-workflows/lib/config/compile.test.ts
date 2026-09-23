import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { validateWorkflowConfigBody } from "./validate.ts";
import { compileConfigWorkflow } from "./compile.ts";
import { createRun, advanceRun } from "../engine.ts";
import { collectOutput } from "../output.ts";

describe("compileConfigWorkflow", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
  });

  it("compiles and runs a prompt+command config to completion", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "config-workflow-"));
    const { result: body } = validateWorkflowConfigBody({
      name: "Say hello and check npm",
      steps: [
        { kind: "prompt", prompt: "Say hello!" },
        { kind: "command", command: "npm", args: ["--version"] },
      ],
    });
    expect(body).toBeDefined();

    const definition = compileConfigWorkflow("test/hello-config", body!, {});
    const runId = await createRun(dbKey, definition, {
      input: {},
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });

    let outcome;
    for (let i = 0; i < 5; i++) {
      const { output, result } = advanceRun(dbKey, definition, runId);
      await collectOutput(output);
      outcome = await result;
      if (outcome.status !== "success") break;
    }

    expect(outcome).toEqual({ status: "done" });
  });

  it("copies pauseAfter onto a compiled prompt step", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "config-pause-"));
    const { result: body } = validateWorkflowConfigBody({
      name: "Pause after the prompt",
      steps: [
        {
          kind: "prompt",
          prompt: "Write the spec.",
          pauseAfter: true,
          pauseMessage: "Review the spec.",
        },
      ],
    });
    const definition = compileConfigWorkflow("test/pause-config", body!, {});
    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "script" });
    const { output, result } = advanceRun(dbKey, definition, runId);
    await collectOutput(output);
    expect(await result).toEqual({ status: "awaiting_user", message: "Review the spec." });
  });
});
