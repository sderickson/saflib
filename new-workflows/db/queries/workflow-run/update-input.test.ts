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
import { updateInputWorkflowRun } from "./update-input.ts";

const now = new Date("2026-09-13T12:00:00.000Z");
const later = new Date("2026-09-13T12:05:00.000Z");

describe("updateInputWorkflowRun", () => {
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

  it("replaces the run's stored input", async () => {
    const { result: created } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "drizzle/update-schema",
      mode: "run",
      input: { path: "./schemas/todos.ts" },
      cwd: "/tmp/example",
      agent_config: null,
      now,
    });
    assert(created);

    const { result, error } = await updateInputWorkflowRun(dbKey, {
      id: created.id,
      input: { path: "./schemas/todo.ts" },
      now: later,
    });

    expect(error).toBeUndefined();
    expect(result?.input).toEqual({ path: "./schemas/todo.ts" });
    expect(result?.updated_at).toEqual(later);
  });

  it("returns WorkflowRunNotFoundError when the id does not exist", async () => {
    const { result, error } = await updateInputWorkflowRun(dbKey, {
      id: "missing",
      input: {},
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(WorkflowRunNotFoundError);
  });
});
