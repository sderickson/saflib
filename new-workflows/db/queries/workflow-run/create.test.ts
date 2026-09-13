import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { createWorkflowRun } from "./create.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("createWorkflowRun", () => {
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

  it("creates a pending run at step 0", async () => {
    const { result, error } = await createWorkflowRun(dbKey, {
      workflow_source: "code",
      workflow_ref: "workflows/add-workflow",
      mode: "script",
      input: { name: "example/example-workflow" },
      cwd: "/tmp/example",
      agent_config: null,
      now,
    });

    expect(error).toBeUndefined();
    expect(result?.status).toBe("pending");
    expect(result?.current_step_index).toBe(0);
    expect(result?.workflow_ref).toBe("workflows/add-workflow");
  });
});
