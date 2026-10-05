import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowStep } from "./create.ts";
import { listByRunWorkflowStep } from "./list-by-run.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("listByRunWorkflowStep", () => {
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

  it("returns steps for the run in step_index order", async () => {
    await createWorkflowStep(dbKey, { run_id: "run-1", step_index: 1, kind: "update", now });
    await createWorkflowStep(dbKey, { run_id: "run-1", step_index: 0, kind: "copy", now });
    await createWorkflowStep(dbKey, { run_id: "run-2", step_index: 0, kind: "cd", now });

    const { result } = await listByRunWorkflowStep(dbKey, { run_id: "run-1" });

    expect(result?.map((r) => r.kind)).toEqual(["copy", "update"]);
  });
});
