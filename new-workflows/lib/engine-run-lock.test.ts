import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import { RUN_LOCK_MESSAGE } from "./run-lock.ts";

const execFileAsync = promisify(execFile);

async function initRepo(): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "engine-run-lock-"));
  await execFileAsync("git", ["init"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: dir });
  writeFileSync(path.join(dir, "README.md"), "hello\n");
  await execFileAsync("git", ["add", "-A"], { cwd: dir });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: dir });
  return dir;
}

// Regression: two root `advanceRun` calls running at the same time — two
// different runs, or the same run advanced twice at once (a double-click
// racing an auto-continue chain) — used to both do real filesystem/git
// work concurrently against the same shared checkout, which is exactly
// what produced the "nothing to commit" and `index.lock` failures fixed
// in git.ts. This system's own git integration is repo-wide, so only one
// root `advanceRun` may ever be doing real work at a time.
describe("advanceRun: only one root call may run at a time", () => {
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

  it("rejects a second advanceRun call (a different run) started while the first is still mid-step", async () => {
    let releaseFirstStep!: () => void;
    const firstStepBlocked = new Promise<void>((resolve) => {
      releaseFirstStep = resolve;
    });
    const slowDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/slow",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step(
          "command",
          async () => {
            await firstStepBlocked;
            return { status: "success" };
          },
          () => ({}),
        ),
      ],
    });
    const fastDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/fast",
      description: "test",
      context: ({ input }) => input,
      steps: [step("command", async () => ({ status: "success" }), () => ({}))],
    });

    const cwd = await initRepo();
    const firstRunId = await createRun(dbKey, slowDefinition, { input: {}, cwd, mode: "run" });
    const secondRunId = await createRun(dbKey, fastDefinition, { input: {}, cwd, mode: "run" });

    const first = advanceRun(dbKey, slowDefinition, firstRunId);
    // Let the first call actually enter its step (and thus acquire the
    // lock) before the second one starts.
    await new Promise((r) => setTimeout(r, 10));

    const second = advanceRun(dbKey, fastDefinition, secondRunId);
    await collectOutput(second.output);
    const secondOutcome = await second.result;

    expect(secondOutcome).toEqual({ status: "error", message: RUN_LOCK_MESSAGE });

    releaseFirstStep();
    await collectOutput(first.output);
    const firstOutcome = await first.result;
    expect(firstOutcome.status).toBe("success");
  });

  it("lets a fresh advanceRun call through once the previous one has finished", async () => {
    const cwd = await initRepo();
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/sequential",
      description: "test",
      context: ({ input }) => input,
      steps: [step("command", async () => ({ status: "success" }), () => ({}))],
    });
    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "run" });

    const first = advanceRun(dbKey, definition, runId);
    await collectOutput(first.output);
    expect((await first.result).status).toBe("success");

    // Only step in this workflow already ran — a second call now just
    // hits "done", proving the lock was released, not that nothing else
    // was ever attempted.
    const second = advanceRun(dbKey, definition, runId);
    await collectOutput(second.output);
    expect((await second.result).status).toBe("done");
  });
});
