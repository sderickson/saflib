import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { appendWorkflowLog } from "./append.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("appendWorkflowLog", () => {
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

  it("appends a log row", async () => {
    const { result, error } = await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "running step 0: copy",
      now,
    });

    expect(error).toBeUndefined();
    expect(result?.channel).toBe("tool");
    expect(result?.content).toBe("running step 0: copy");
  });
});
