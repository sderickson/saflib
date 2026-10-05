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
import { WorkflowRunNotFoundError } from "../../errors.ts";
import { createWorkflowRun } from "./create.ts";
import { updateStatusAndStepWorkflowRun } from "./update-status-and-step.ts";

const now = new Date("2026-09-13T12:00:00.000Z");
const later = new Date("2026-09-13T12:05:00.000Z");

describe("updateStatusAndStepWorkflowRun", () => {
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

  it("advances status and step index", async () => {
    const { result: created } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "workflows/add-workflow",
      mode: "script",
      input: {},
      cwd: "/tmp/example",
      agent_config: null,
      now,
    });
    assert(created);

    const { result, error } = await updateStatusAndStepWorkflowRun(dbKey, {
      id: created.id,
      status: "running",
      current_step_index: 1,
      now: later,
    });

    expect(error).toBeUndefined();
    expect(result?.status).toBe("running");
    expect(result?.current_step_index).toBe(1);
  });

  it("returns WorkflowRunNotFoundError when the id does not exist", async () => {
    const { result, error } = await updateStatusAndStepWorkflowRun(dbKey, {
      id: "missing",
      status: "running",
      current_step_index: 1,
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(WorkflowRunNotFoundError);
  });
});
