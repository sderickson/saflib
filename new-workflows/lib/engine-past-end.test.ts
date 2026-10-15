import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import {
  getByIdWorkflowRun,
  updateStatusAndStepWorkflowRun,
} from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import type { StepFn } from "./types.ts";

const noop: StepFn<Record<string, never>> = async () => ({ status: "success" });

describe("advanceRun when current_step_index is past the workflow definition", () => {
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

  it("marks the run done in the database", async () => {
    const definition = defineWorkflow({
      id: "test/past-end",
      description: "one step",
      inputSchema: { type: "object", properties: {} },
      context: () => ({}),
      steps: [step("noop", noop, () => ({}))],
    });

    const runId = await createRun(dbKey, definition, {
      input: {},
      cwd: process.cwd(),
      mode: "run",
    });

    await updateStatusAndStepWorkflowRun(dbKey, {
      id: runId,
      status: "running",
      current_step_index: 3,
      now: new Date(),
    });

    const empty = defineWorkflow({
      id: "test/past-end",
      description: "no steps",
      inputSchema: { type: "object", properties: {} },
      context: () => ({}),
      steps: [],
    });

    const again = advanceRun(dbKey, empty, runId);
    await again.output;
    expect((await again.result).status).toBe("done");

    const { result: fixed } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(fixed?.status).toBe("done");
  });
});
