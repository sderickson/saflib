import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { appendWorkflowLog } from "./append.ts";
import { listByRunWorkflowLog } from "./list-by-run.ts";

// `created_at` is stored as integer seconds, so offsets must be >= 1s apart.
const t = (offsetSeconds: number) =>
  new Date(new Date("2026-09-13T12:00:00.000Z").getTime() + offsetSeconds * 1000);

describe("listByRunWorkflowLog", () => {
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

  it("returns rows for the run in creation order", async () => {
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "first",
      now: t(0),
    });
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 0,
      channel: "terminal",
      level: "info",
      content: "second",
      now: t(1),
    });
    await appendWorkflowLog(dbKey, {
      run_id: "run-2",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "other run",
      now: t(2),
    });

    const { result, error } = await listByRunWorkflowLog(dbKey, {
      run_id: "run-1",
    });

    expect(error).toBeUndefined();
    expect(result?.map((r) => r.content)).toEqual(["first", "second"]);
  });

  it("supports paging via `after`", async () => {
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "first",
      now: t(0),
    });
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "second",
      now: t(1),
    });

    const { result } = await listByRunWorkflowLog(dbKey, {
      run_id: "run-1",
      after: t(0),
    });

    expect(result?.map((r) => r.content)).toEqual(["second"]);
  });
});
