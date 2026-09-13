import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  assert,
} from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowStepNotFoundError } from "../../errors.ts";
import { createWorkflowStep } from "./create.ts";
import { updateResultWorkflowStep } from "./update-result.ts";

const now = new Date("2026-09-13T12:00:00.000Z");
const later = new Date("2026-09-13T12:00:05.000Z");

describe("updateResultWorkflowStep", () => {
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

  it("records a success result", async () => {
    const { result: created } = await createWorkflowStep(dbKey, {
      run_id: "run-1",
      step_index: 0,
      kind: "copy",
      now,
    });
    assert(created);

    const { result, error } = await updateResultWorkflowStep(dbKey, {
      id: created.id,
      status: "success",
      result: { copiedFiles: 3 },
      error: null,
      now: later,
    });

    expect(error).toBeUndefined();
    expect(result?.status).toBe("success");
    expect(result?.result).toEqual({ copiedFiles: 3 });
    expect(result?.finished_at).toEqual(later);
  });

  it("returns WorkflowStepNotFoundError when the id does not exist", async () => {
    const { result, error } = await updateResultWorkflowStep(dbKey, {
      id: "missing",
      status: "error",
      result: null,
      error: "boom",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(WorkflowStepNotFoundError);
  });
});
