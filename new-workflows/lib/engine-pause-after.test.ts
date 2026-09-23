import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import { runPromptStep, type PromptStepInput } from "./steps/prompt.ts";

describe("advanceRun pauseAfter", () => {
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

  it("returns awaiting_user after a successful step and resumes at the next step", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "pause-after-"));
    const definition = defineWorkflow({
      id: "test/pause-after",
      description: "pause between two prompts",
      context: () => ({}),
      steps: [
        step<PromptStepInput, Record<string, never>>(
          "prompt",
          runPromptStep,
          () => ({ prompt: "write the spec" }),
          { pauseAfter: true, pauseMessage: "Review the spec." },
        ),
        step<PromptStepInput, Record<string, never>>("prompt", runPromptStep, () => ({
          prompt: "write the phases",
        })),
      ],
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "script" });

    const first = advanceRun(dbKey, definition, runId);
    await collectOutput(first.output);
    const paused = await first.result;
    expect(paused).toEqual({ status: "awaiting_user", message: "Review the spec." });

    const { result: mid } = await getByIdWorkflowRun(dbKey, { id: runId });
    if (!mid) throw new Error("run missing after pause");
    expect(mid.status).toBe("awaiting_user");
    expect(mid.current_step_index).toBe(1);

    const second = advanceRun(dbKey, definition, runId);
    await collectOutput(second.output);
    expect((await second.result).status).toBe("success");

    const { result: finished } = await getByIdWorkflowRun(dbKey, { id: runId });
    if (!finished) throw new Error("run missing after the last step");
    expect(finished.status).toBe("done");
    expect(finished.current_step_index).toBe(2);
  });
});
