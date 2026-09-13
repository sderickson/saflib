import { describe, it, expect, beforeAll, afterAll, beforeEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowRun } from "./create.ts";
import { getChildByParentStepWorkflowRun } from "./get-child-by-parent-step.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("getChildByParentStepWorkflowRun", () => {
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

  it("returns null when no child run exists yet", async () => {
    const { result } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: "missing",
      parent_step_index: 0,
    });
    expect(result).toBeNull();
  });

  it("finds the child run created for a given parent run/step", async () => {
    const { result: parent } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "example/hello",
      mode: "run",
      input: {},
      cwd: "/tmp",
      agent_config: null,
      now,
    });
    assert(parent);

    const { result: child } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "example/other",
      mode: "run",
      input: {},
      cwd: "/tmp",
      agent_config: null,
      parent_run_id: parent.id,
      parent_step_index: 0,
      now,
    });
    assert(child);

    const { result } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: parent.id,
      parent_step_index: 0,
    });

    expect(result?.id).toBe(child.id);
  });
});
