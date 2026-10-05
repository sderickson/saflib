import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "../../instances.ts";
import { appendWorkflowLog } from "./append.ts";
import { listByRunWorkflowLog } from "./list-by-run.ts";

// `created_at` is stored as integer seconds, so offsets must be >= 1s apart.
const t = (offsetSeconds: number) =>
  new Date(new Date("2026-09-13T12:00:00.000Z").getTime() + offsetSeconds * 1000);

async function seedRun(dbKey: DbKey, count: number) {
  for (let i = 0; i < count; i++) {
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: `log-${i}`,
      now: t(i),
    });
  }
}

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

  it("returns rows newest-first, limited, with has_more", async () => {
    await seedRun(dbKey, 5);
    await appendWorkflowLog(dbKey, {
      run_id: "run-2",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "other run",
      now: t(99),
    });

    const { result, error } = await listByRunWorkflowLog(dbKey, {
      run_id: "run-1",
      limit: 3,
    });

    expect(error).toBeUndefined();
    expect(result?.logs.map((r) => r.content)).toEqual(["log-4", "log-3", "log-2"]);
    expect(result?.has_more).toBe(true);
  });

  it("pages older history via `before`", async () => {
    await seedRun(dbKey, 5);

    const first = await listByRunWorkflowLog(dbKey, { run_id: "run-1", limit: 2 });
    expect(first.result?.logs.map((r) => r.content)).toEqual(["log-4", "log-3"]);
    expect(first.result?.has_more).toBe(true);

    const older = await listByRunWorkflowLog(dbKey, {
      run_id: "run-1",
      before: first.result!.logs.at(-1)!.created_at,
      limit: 2,
    });
    expect(older.result?.logs.map((r) => r.content)).toEqual(["log-2", "log-1"]);
    expect(older.result?.has_more).toBe(true);
  });

  it("pages newer rows via `after`", async () => {
    await seedRun(dbKey, 3);

    const { result } = await listByRunWorkflowLog(dbKey, {
      run_id: "run-1",
      after: t(0),
      limit: 10,
    });

    expect(result?.logs.map((r) => r.content)).toEqual(["log-2", "log-1"]);
    expect(result?.has_more).toBe(false);
    expect(result?.has_more_newer).toBe(false);
  });

  it("pages the next newer rows contiguously via afterContiguous", async () => {
    await seedRun(dbKey, 5);

    const { result } = await listByRunWorkflowLog(dbKey, {
      run_id: "run-1",
      after: t(0),
      afterContiguous: true,
      limit: 2,
    });

    expect(result?.logs.map((r) => r.content)).toEqual(["log-2", "log-1"]);
    expect(result?.has_more_newer).toBe(true);
  });

  it("anchors a page at a step that is not in the newest page", async () => {
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "step-0",
      now: t(0),
    });
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 5,
      channel: "tool",
      level: "info",
      content: "step-5-a",
      now: t(1),
    });
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 5,
      channel: "tool",
      level: "info",
      content: "step-5-b",
      now: t(2),
    });
    await appendWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 6,
      channel: "tool",
      level: "info",
      content: "step-6",
      now: t(3),
    });

    const { result } = await listByRunWorkflowLog(dbKey, {
      run_id: "run-1",
      step_index: 5,
      limit: 2,
    });

    expect(result?.logs.map((r) => r.content)).toEqual(["step-5-b", "step-5-a"]);
    expect(result?.has_more).toBe(true);
    expect(result?.has_more_newer).toBe(true);
  });
});
