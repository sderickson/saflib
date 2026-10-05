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
import { getByIdWorkflowRun } from "./get-by-id.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("getByIdWorkflowRun", () => {
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

  it("returns the run row by id", async () => {
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

    const { result, error } = await getByIdWorkflowRun(dbKey, {
      id: created.id,
    });

    expect(error).toBeUndefined();
    expect(result?.id).toBe(created.id);
  });

  it("returns WorkflowRunNotFoundError when the id does not exist", async () => {
    const { result, error } = await getByIdWorkflowRun(dbKey, {
      id: "missing",
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(WorkflowRunNotFoundError);
  });
});
