import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { appendWorkflowLog, getByIdWorkflowRun, listByRunWorkflowLog } from "@saflib/new-workflows-db";
import { createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import { HelloWorkflowDefinition } from "./example-workflows/hello-workflow.ts";
import { pruneWorkflowHistory } from "./prune-history.ts";

describe("pruneWorkflowHistory", () => {
  let dbKey: DbKey;
  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });
  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  it("deletes a finished run's logs once they're older than the log cutoff, and stamps the run", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "prune-"));
    const runId = await createRun(dbKey, HelloWorkflowDefinition, { input: {}, cwd, mode: "script" });
    for (let i = 0; i < 10; i++) {
      const { output, result } = advanceRun(dbKey, HelloWorkflowDefinition, runId);
      await collectOutput(output);
      if ((await result).status === "done") break;
    }
    // The HTTP layer is what persists log rows; stand in for it.
    await appendWorkflowLog(dbKey, {
      run_id: runId,
      step_index: 0,
      channel: "tool",
      level: "info",
      content: "hello",
      source_run_id: runId,
      source_step_index: 0,
      now: new Date(),
    });
    expect((await listByRunWorkflowLog(dbKey, { run_id: runId })).result!.logs.length).toBeGreaterThan(0);

    // Today: nothing is old enough yet.
    expect((await pruneWorkflowHistory(dbKey)).logRowsDeleted).toBe(0);

    const later = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    const pruned = await pruneWorkflowHistory(dbKey, { now: later });
    expect(pruned.logRowsDeleted).toBeGreaterThan(0);
    expect((await listByRunWorkflowLog(dbKey, { run_id: runId })).result!.logs).toEqual([]);
    expect((await getByIdWorkflowRun(dbKey, { id: runId })).result?.logs_pruned_at).toEqual(
      new Date(Math.floor(later.getTime() / 1000) * 1000),
    );
  });
});
