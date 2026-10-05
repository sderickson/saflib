import { describe, it, expect, beforeAll, afterAll, beforeEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowConfigNotFoundError } from "../../errors.ts";
import { createWorkflowConfig } from "./create.ts";
import { getByIdWorkflowConfig } from "./get-by-id.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("getByIdWorkflowConfig", () => {
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

  it("returns the config row by id", async () => {
    const { result: created } = await createWorkflowConfig(dbKey, {
      name: "Say hello",
      config: { name: "Say hello", steps: [] },
      created_by: "user-1",
      now,
    });
    assert(created);

    const { result, error } = await getByIdWorkflowConfig(dbKey, { id: created.id });

    expect(error).toBeUndefined();
    expect(result?.id).toBe(created.id);
  });

  it("returns WorkflowConfigNotFoundError when the id does not exist", async () => {
    const { result, error } = await getByIdWorkflowConfig(dbKey, { id: "missing" });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(WorkflowConfigNotFoundError);
  });
});
