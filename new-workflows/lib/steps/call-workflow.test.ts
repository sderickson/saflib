import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getChildByParentStepWorkflowRun } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "../engine.ts";
import { collectOutput } from "../output.ts";
import { runCallWorkflowStep, type CallWorkflowStepInput } from "./call-workflow.ts";

describe("runCallWorkflowStep retry semantics", () => {
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

  it("refreshes a failed child's stored input from a freshly-recomputed targetInput on retry", async () => {
    // Standing in for `drizzle/update-schema`'s real plural-name
    // validation — the case that motivated this fix: a config plan's
    // `call-workflow` step passed a bad path, the nested child run failed
    // and got persisted with that bad input, the user fixed the plan
    // file, but retrying the parent kept reproducing the same failure
    // because the child's *stored* input was never refreshed.
    let attempts = 0;
    const TargetDefinition = defineWorkflow<{ path: string }, { path: string }>({
      id: "test/validates-path",
      description: "test",
      context: ({ input }) => ({ path: input.path }),
      steps: [
        {
          kind: "command",
          input: ({ context }) => ({ path: context.path }),
          run: async (rawInput) => {
            attempts++;
            const { path: p } = rawInput as { path: string };
            if (p === "./schemas/todos.ts") {
              return {
                status: "error",
                message: "Table name is todos and should not be plural.",
              };
            }
            return { status: "success" };
          },
        },
      ],
    });

    // The "parent": its call-workflow input is recomputed from
    // `parentPath` every time `context()` runs, standing in for a config
    // plan file that gets edited between attempts.
    let parentPath = "./schemas/todos.ts";
    const ParentDefinition = defineWorkflow<Record<string, never>, { targetPath: string }>({
      id: "test/parent",
      description: "test",
      context: () => ({ targetPath: parentPath }),
      steps: [
        step<CallWorkflowStepInput, { targetPath: string }>(
          "call-workflow",
          runCallWorkflowStep,
          ({ context }) => ({
            targetDefinition: TargetDefinition,
            targetInput: { path: context.targetPath },
          }),
        ),
      ],
    });

    const cwd = mkdtempSync(path.join(tmpdir(), "call-workflow-retry-"));
    const runId = await createRun(dbKey, ParentDefinition, { input: {}, cwd, mode: "run" });

    // First attempt: fails, using the bad (plural) path.
    const first = advanceRun(dbKey, ParentDefinition, runId);
    await collectOutput(first.output);
    const firstOutcome = await first.result;
    expect(firstOutcome.status).toBe("error");
    expect(attempts).toBe(1);

    const { result: childAfterFirst } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: 0,
    });
    expect(childAfterFirst?.input).toEqual({ path: "./schemas/todos.ts" });

    // The user fixes the plan file — the parent's own `context()` (and
    // thus the recomputed `targetInput`) now reflects the correction.
    parentPath = "./schemas/todo.ts";

    const second = advanceRun(dbKey, ParentDefinition, runId);
    await collectOutput(second.output);
    const secondOutcome = await second.result;

    expect(secondOutcome).toEqual({ status: "success" });
    expect(attempts).toBe(2);

    const { result: childAfterRetry } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: 0,
    });
    expect(childAfterRetry?.input).toEqual({ path: "./schemas/todo.ts" });
  });

  it("does not reset input for a child that's legitimately mid-flow (awaiting_prompt)", async () => {
    const TargetDefinition = defineWorkflow<{ name: string }, { name: string }>({
      id: "test/two-step-target",
      description: "test",
      context: ({ input }) => ({ name: input.name }),
      steps: [
        {
          kind: "prompt",
          input: ({ context }) => ({ prompt: `Say hi to ${context.name}` }),
          run: async (_input, ctx) =>
            ctx.isResume
              ? { status: "success" }
              : { status: "awaiting_prompt", prompt: "waiting" },
        },
        {
          kind: "command",
          input: () => ({}),
          run: async () => ({ status: "success" }),
        },
      ],
    });

    let parentName = "alice";
    const ParentDefinition = defineWorkflow<Record<string, never>, { targetName: string }>({
      id: "test/parent-2",
      description: "test",
      context: () => ({ targetName: parentName }),
      steps: [
        step<CallWorkflowStepInput, { targetName: string }>(
          "call-workflow",
          runCallWorkflowStep,
          ({ context }) => ({
            targetDefinition: TargetDefinition,
            targetInput: { name: context.targetName },
          }),
        ),
      ],
    });

    const cwd = mkdtempSync(path.join(tmpdir(), "call-workflow-resume-"));
    const runId = await createRun(dbKey, ParentDefinition, { input: {}, cwd, mode: "run" });

    const first = advanceRun(dbKey, ParentDefinition, runId);
    await collectOutput(first.output);
    expect((await first.result).status).toBe("awaiting_prompt");

    // Something else changes what a *fresh* call would compute — but the
    // child is legitimately mid-flow (awaiting_prompt), so resuming it
    // should not silently swap its input out from under it.
    parentName = "bob";

    const second = advanceRun(dbKey, ParentDefinition, runId);
    await collectOutput(second.output);
    expect((await second.result).status).toBe("success");

    const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: 0,
    });
    expect(child?.input).toEqual({ name: "alice" });
  });
});
