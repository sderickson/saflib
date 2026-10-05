import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowStep } from "./create.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("createWorkflowStep", () => {
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

  it("creates a running step attempt row", async () => {
    const { result, error } = await createWorkflowStep(dbKey, {
      run_id: "run-1",
      step_index: 0,
      kind: "copy",
      now,
    });

    expect(error).toBeUndefined();
    expect(result?.status).toBe("running");
    expect(result?.finished_at).toBeNull();
  });
});
