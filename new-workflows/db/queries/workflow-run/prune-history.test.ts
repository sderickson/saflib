import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import { newWorkflowsDbManager } from "../../instances.ts";
import { pruneHistoryWorkflowRun, vacuumIfMostlyFreeWorkflowDb } from "./prune-history.ts";
import { workflowRunTable, type WorkflowRunStatus } from "../../schemas/workflow-run.ts";
import { workflowLogTable } from "../../schemas/workflow-log.ts";
import { workflowStepTable } from "../../schemas/workflow-step.ts";
import { workflowAgentTurnTable } from "../../schemas/workflow-agent-turn.ts";
import { workflowAgentTurnRawTable } from "../../schemas/workflow-agent-turn-raw.ts";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-15T12:00:00.000Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

describe("pruneHistoryWorkflowRun", () => {
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

  /** A run with one step, one log row, and one agent turn with raw output. */
  async function seedRun(opts: {
    id: string;
    status: WorkflowRunStatus;
    updated: Date;
    parent?: string;
    logUnder?: string;
  }) {
    const db = newWorkflowsDbManager.get(dbKey)!;
    await db.insert(workflowRunTable).values({
      id: opts.id,
      workflow_source: "code",
      workflow_ref: "test/wf",
      input: {},
      status: opts.status,
      cwd: "/tmp",
      parent_run_id: opts.parent ?? null,
      parent_step_index: opts.parent ? 0 : null,
      created_at: opts.updated,
      updated_at: opts.updated,
    });
    await db.insert(workflowStepTable).values({
      run_id: opts.id,
      step_index: 0,
      kind: "prompt",
      status: "success",
      started_at: opts.updated,
    });
    await db.insert(workflowLogTable).values({
      run_id: opts.logUnder ?? opts.id,
      step_index: 0,
      channel: "agent",
      level: "info",
      content: `log of ${opts.id}`,
      created_at: opts.updated,
    });
    const [turn] = await db
      .insert(workflowAgentTurnTable)
      .values({
        run_id: opts.id,
        step_index: 0,
        session_run_id: opts.parent ?? opts.id,
        cli: "mock-agent",
        status: "success",
        prompt_chars: 1,
        started_at: opts.updated,
        finished_at: opts.updated,
      })
      .returning();
    await db.insert(workflowAgentTurnRawTable).values({
      turn_id: turn!.id,
      output: "{}",
      omitted_chars: 0,
      created_at: opts.updated,
    });
  }

  async function counts(runId: string) {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const turns = await db.select().from(workflowAgentTurnTable).where(eq(workflowAgentTurnTable.run_id, runId));
    const raw = await db.select().from(workflowAgentTurnRawTable);
    return {
      runs: (await db.select().from(workflowRunTable).where(eq(workflowRunTable.id, runId))).length,
      steps: (await db.select().from(workflowStepTable).where(eq(workflowStepTable.run_id, runId))).length,
      logs: (await db.select().from(workflowLogTable).where(eq(workflowLogTable.run_id, runId))).length,
      turns: turns.length,
      raw: raw.filter((r) => turns.some((t) => t.id === r.turn_id)).length,
    };
  }

  const prune = () =>
    pruneHistoryWorkflowRun(dbKey, { rawBefore: daysAgo(7), logsBefore: daysAgo(30), now });

  it("drops raw output after the raw cutoff and logs after the log cutoff, keeping the summary rows", async () => {
    await seedRun({ id: "fresh", status: "done", updated: daysAgo(1) });
    await seedRun({ id: "week", status: "done", updated: daysAgo(10) });
    await seedRun({ id: "month", status: "failed", updated: daysAgo(40) });

    const { result } = await prune();

    expect(result).toEqual({ rawRowsDeleted: 2, logRowsDeleted: 1, runsPruned: 1 });
    expect(await counts("fresh")).toEqual({ runs: 1, steps: 1, logs: 1, turns: 1, raw: 1 });
    expect(await counts("week")).toEqual({ runs: 1, steps: 1, logs: 1, turns: 1, raw: 0 });
    expect(await counts("month")).toEqual({ runs: 1, steps: 1, logs: 0, turns: 1, raw: 0 });

    const db = newWorkflowsDbManager.get(dbKey)!;
    const [month] = await db.select().from(workflowRunTable).where(eq(workflowRunTable.id, "month"));
    expect(month!.logs_pruned_at).toEqual(now);
  });

  it("never touches runs that are still going or waiting on someone, however old", async () => {
    for (const status of ["pending", "running", "awaiting_prompt", "awaiting_user"] as const) {
      await seedRun({ id: status, status, updated: daysAgo(100) });
    }
    const { result } = await prune();
    expect(result).toEqual({ rawRowsDeleted: 0, logRowsDeleted: 0, runsPruned: 0 });
  });

  it("prunes a nested run along with its root, and only by the root's age and status", async () => {
    await seedRun({ id: "root", status: "done", updated: daysAgo(40) });
    // Logs are filed under the root; this child's row is old but its own raw output still goes.
    await seedRun({ id: "child", status: "done", updated: daysAgo(40), parent: "root", logUnder: "root" });
    await seedRun({ id: "live-root", status: "awaiting_user", updated: daysAgo(40) });
    await seedRun({ id: "live-child", status: "done", updated: daysAgo(40), parent: "live-root" });

    const { result } = await prune();

    expect(result).toEqual({ rawRowsDeleted: 2, logRowsDeleted: 2, runsPruned: 2 });
    expect((await counts("live-child")).raw).toBe(1);
    expect((await counts("live-child")).logs).toBe(1);
  });

  it("is a no-op the second time", async () => {
    await seedRun({ id: "month", status: "done", updated: daysAgo(40) });
    await prune();
    expect((await prune()).result).toEqual({ rawRowsDeleted: 0, logRowsDeleted: 0, runsPruned: 0 });
  });
});

describe("vacuumIfMostlyFreeWorkflowDb", () => {
  let dbKey: DbKey;
  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });
  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  it("skips the vacuum when little of the file is free", async () => {
    const { result } = await vacuumIfMostlyFreeWorkflowDb(dbKey, { minFreeFraction: 0.99 });
    expect(result?.vacuumed).toBe(false);
    expect(result?.pages).toBeGreaterThan(0);
  });
});
