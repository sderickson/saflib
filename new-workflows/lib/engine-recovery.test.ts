import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import type { StepOutcome } from "./types.ts";

const execFileAsync = promisify(execFile);

async function initRepo(): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "engine-recovery-"));
  await execFileAsync("git", ["init"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: dir });
  writeFileSync(path.join(dir, "README.md"), "hello\n");
  await execFileAsync("git", ["add", "-A"], { cwd: dir });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: dir });
  return dir;
}

async function commitMessages(dir: string): Promise<string[]> {
  const { stdout } = await execFileAsync("git", ["log", "--format=%s"], { cwd: dir });
  return stdout.trim().split("\n").filter(Boolean);
}

describe("advanceRun recovery options", () => {
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

  it("commits after a successful step, with a message derived from the step's kind/label", async () => {
    const cwd = await initRepo();
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/commit-on-success",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step("command", async (_input, ctx) => {
          writeFileSync(path.join(ctx.cwd, "generated.ts"), "export const x = 1;\n");
          return { status: "success" };
        }, () => ({ command: "true", args: [] })),
      ],
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "run" });
    const { output, result } = advanceRun(dbKey, definition, runId);
    await collectOutput(output);
    const outcome = await result;

    expect(outcome.status).toBe("success");
    expect(existsSync(path.join(cwd, "generated.ts"))).toBe(true);
    const messages = await commitMessages(cwd);
    expect(messages[0]).toContain("test/commit-on-success");
    expect(messages[0]).toContain("true");
  });

  it("revert discards a failed attempt's uncommitted changes before retrying", async () => {
    const cwd = await initRepo();
    let attempt = 0;
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/revert-then-retry",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step<Record<string, never>, Record<string, unknown>>(
          "command",
          async (_input, ctx): Promise<StepOutcome> => {
            attempt++;
            writeFileSync(path.join(ctx.cwd, `attempt-${attempt}.txt`), "x\n");
            if (attempt === 1) {
              return { status: "error", message: "simulated failure" };
            }
            return { status: "success" };
          },
          () => ({}),
        ),
      ],
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "run" });

    // First attempt fails, leaving attempt-1.txt uncommitted.
    const first = advanceRun(dbKey, definition, runId);
    await collectOutput(first.output);
    const firstOutcome = await first.result;
    expect(firstOutcome.status).toBe("error");
    expect(existsSync(path.join(cwd, "attempt-1.txt"))).toBe(true);

    // Retry with revert: the failed attempt's file should be gone before
    // the step runs again — and since the step is deterministic on
    // `attempt`, this retry writes attempt-2.txt and succeeds.
    const second = advanceRun(dbKey, definition, runId, { revert: true });
    await collectOutput(second.output);
    const secondOutcome = await second.result;

    expect(secondOutcome.status).toBe("success");
    expect(existsSync(path.join(cwd, "attempt-1.txt"))).toBe(false);
    expect(existsSync(path.join(cwd, "attempt-2.txt"))).toBe(true);
  });

  it("skip commits whatever's dirty without running the step, and advances past it", async () => {
    const cwd = await initRepo();
    let ran = false;
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/skip",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step<Record<string, never>, Record<string, unknown>>(
          "command",
          async (_input, ctx) => {
            ran = true;
            writeFileSync(path.join(ctx.cwd, "should-not-exist.txt"), "x\n");
            return { status: "success" };
          },
          () => ({}),
        ),
        step<Record<string, never>, Record<string, unknown>>(
          "command",
          async () => ({ status: "success" }),
          () => ({}),
        ),
      ],
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "run" });
    // Simulate leftover manual/partial state sitting in the checkout.
    writeFileSync(path.join(cwd, "leftover.txt"), "keep\n");

    const { output, result } = advanceRun(dbKey, definition, runId, { skip: true });
    await collectOutput(output);
    const outcome = await result;

    expect(outcome).toEqual({ status: "success", result: { skipped: true } });
    expect(ran).toBe(false);
    expect(existsSync(path.join(cwd, "should-not-exist.txt"))).toBe(false);
    expect(readFileSync(path.join(cwd, "leftover.txt"), "utf-8")).toBe("keep\n");
    const messages = await commitMessages(cwd);
    expect(messages[0]).toContain("skip");

    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run?.current_step_index).toBe(1);
  });

  it("threads extraPrompt into the step's context for that one call", async () => {
    const cwd = await initRepo();
    const seen: (string | undefined)[] = [];
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/extra-prompt",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step<Record<string, never>, Record<string, unknown>>(
          "command",
          async (_input, ctx) => {
            seen.push(ctx.extraPrompt);
            return { status: "success" };
          },
          () => ({}),
        ),
      ],
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "run" });
    const { output, result } = advanceRun(dbKey, definition, runId, {
      extraPrompt: "Use ignorePlural, it's already singular.",
    });
    await collectOutput(output);
    await result;

    expect(seen).toEqual(["Use ignorePlural, it's already singular."]);
  });

  it("persists a run as failed (with a step row) when def.context() itself throws, not just when step.run() does", async () => {
    // Regression: `drizzle/update-schema`'s plural-table-name check lives
    // inside `context()`, which used to run *before* the step row was
    // created and before the run's status was ever persisted — a throw
    // there left the run stuck at "pending" forever, invisible to any
    // retry logic gated on `status === "failed"`.
    const cwd = await initRepo();
    let shouldThrow = true;
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/context-throws",
      description: "test",
      context: () => {
        if (shouldThrow) throw new Error("simulated context validation failure");
        return {};
      },
      steps: [
        step<Record<string, never>, Record<string, unknown>>(
          "command",
          async () => ({ status: "success" }),
          () => ({}),
        ),
      ],
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "run" });
    const first = advanceRun(dbKey, definition, runId);
    await collectOutput(first.output);
    const firstOutcome = await first.result;

    expect(firstOutcome).toEqual({
      status: "error",
      message: "simulated context validation failure",
    });
    const { result: failedRun } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(failedRun?.status).toBe("failed");
    expect(failedRun?.current_step_index).toBe(0);

    shouldThrow = false;
    const second = advanceRun(dbKey, definition, runId);
    await collectOutput(second.output);
    const secondOutcome = await second.result;

    expect(secondOutcome.status).toBe("success");
  });
});
