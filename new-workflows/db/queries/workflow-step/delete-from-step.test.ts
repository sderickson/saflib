import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowStep } from "./create.ts";
import { updateResultWorkflowStep } from "./update-result.ts";
import { listByRunWorkflowStep } from "./list-by-run.ts";
import { deleteFromStepWorkflowStep } from "./delete-from-step.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("deleteFromStepWorkflowStep", () => {
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

  it("deletes the target index and every later attempt on that run", async () => {
    for (const step_index of [0, 1, 2]) {
      const { result: row } = await createWorkflowStep(dbKey, {
        run_id: "run-1",
        step_index,
        kind: "copy",
        now,
      });
      await updateResultWorkflowStep(dbKey, {
        id: row!.id,
        status: "success",
        result: { step_index },
        error: null,
        now,
      });
    }
    // Other runs are untouched.
    await createWorkflowStep(dbKey, {
      run_id: "run-2",
      step_index: 1,
      kind: "copy",
      now,
    });

    const { result: deleted, error } = await deleteFromStepWorkflowStep(dbKey, {
      run_id: "run-1",
      from_step_index: 1,
    });
    expect(error).toBeUndefined();
    expect(deleted?.map((r) => r.step_index).sort()).toEqual([1, 2]);

    const { result: remaining } = await listByRunWorkflowStep(dbKey, { run_id: "run-1" });
    expect(remaining?.map((r) => r.step_index)).toEqual([0]);

    const { result: other } = await listByRunWorkflowStep(dbKey, { run_id: "run-2" });
    expect(other).toHaveLength(1);
  });
});
