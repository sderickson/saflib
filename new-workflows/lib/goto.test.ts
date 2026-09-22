import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import {
  getByIdWorkflowRun,
  listByRunWorkflowStep,
} from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import { runCallWorkflowStep } from "./steps/call-workflow.ts";
import {
  parseGotoPath,
  gotoRunStep,
  buildStepTree,
  GotoPathError,
} from "./goto.ts";
import type { StepOutcome } from "./types.ts";

describe("parseGotoPath", () => {
  it("parses slash-separated indices", () => {
    expect(parseGotoPath("3")).toEqual([3]);
    expect(parseGotoPath("2/4")).toEqual([2, 4]);
    expect(parseGotoPath("1/0/2")).toEqual([1, 0, 2]);
  });

  it("rejects non-integer segments", () => {
    expect(() => parseGotoPath("2/a")).toThrow(GotoPathError);
    expect(() => parseGotoPath("")).toThrow(GotoPathError);
    expect(() => parseGotoPath("-1")).toThrow(GotoPathError);
  });
});

describe("gotoRunStep", () => {
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

  it("seeks a root-only path and invalidates from the target onward", async () => {
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/goto-root",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
      ],
    });

    const runId = await createRun(dbKey, definition, {
      input: {},
      cwd: "/tmp",
      mode: "run",
    });

    // Advance past step 0 and 1 so we have step rows to invalidate.
    for (let i = 0; i < 2; i++) {
      const { output, result } = advanceRun(dbKey, definition, runId);
      await collectOutput(output);
      expect((await result).status).toBe("success");
    }

    const before = await listByRunWorkflowStep(dbKey, { run_id: runId });
    expect(before.result?.map((s) => s.step_index).sort()).toEqual([0, 1]);

    await gotoRunStep(dbKey, runId, [0], [definition]);

    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run?.current_step_index).toBe(0);
    expect(run?.status).toBe("pending");

    const after = await listByRunWorkflowStep(dbKey, { run_id: runId });
    expect(after.result).toEqual([]);

    // Re-advancing step 0 must not be a false resume.
    let sawResume: boolean | undefined;
    const resumeProbe = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/goto-root",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step(
          "noop",
          async (_input, ctx): Promise<StepOutcome> => {
            sawResume = ctx.isResume;
            return { status: "success" };
          },
          () => ({}),
        ),
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
      ],
    });
    const again = advanceRun(dbKey, resumeProbe, runId);
    await collectOutput(again.output);
    await again.result;
    expect(sawResume).toBe(false);
  });

  it("parks ancestors and seeks a nested path", async () => {
    const childDef = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/goto-child",
      description: "child",
      context: ({ input }) => input,
      steps: [
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
      ],
    });
    const parentDef = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/goto-parent",
      description: "parent",
      context: ({ input }) => input,
      steps: [
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
        step(
          "call-workflow",
          runCallWorkflowStep,
          () => ({ targetDefinition: childDef, targetInput: {} }),
        ),
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
      ],
    });

    const parentRunId = await createRun(dbKey, parentDef, {
      input: {},
      cwd: "/tmp",
      mode: "run",
    });

    // Step 0 success.
    {
      const { output, result } = advanceRun(dbKey, parentDef, parentRunId);
      await collectOutput(output);
      expect((await result).status).toBe("success");
    }
    // Step 1 (call-workflow) drives the whole child to done in one advance.
    {
      const { output, result } = advanceRun(dbKey, parentDef, parentRunId);
      await collectOutput(output);
      expect((await result).status).toBe("success");
    }

    const tree = await buildStepTree(dbKey, parentRunId, [parentDef, childDef]);
    expect(tree.map((n) => n.path)).toEqual(["0", "1", "2"]);
    expect(tree[1]!.children?.map((c) => c.path)).toEqual(["1/0", "1/1", "1/2"]);

    await gotoRunStep(dbKey, parentRunId, [1, 1], [parentDef, childDef]);

    const { result: parent } = await getByIdWorkflowRun(dbKey, { id: parentRunId });
    expect(parent?.current_step_index).toBe(1);
    expect(parent?.status).toBe("pending");

    const treeAfter = await buildStepTree(dbKey, parentRunId, [parentDef, childDef]);
    const childNode = treeAfter[1]!.children![1]!;
    expect(childNode.path).toBe("1/1");
    expect(childNode.isCurrent).toBe(true);
    expect(treeAfter[1]!.isCurrent).toBe(true);

    // Child steps at index >= 1 should be gone; step 0 may remain.
    const childRunId = childNode.runId!;
    const { result: childSteps } = await listByRunWorkflowStep(dbKey, { run_id: childRunId });
    expect(childSteps?.every((s) => s.step_index < 1)).toBe(true);
  });

  it("errors when descending into a call-workflow with no child run yet", async () => {
    const childDef = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/goto-missing-child",
      description: "child",
      context: ({ input }) => input,
      steps: [
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
      ],
    });
    const parentDef = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/goto-missing-parent",
      description: "parent",
      context: ({ input }) => input,
      steps: [
        step(
          "call-workflow",
          runCallWorkflowStep,
          () => ({ targetDefinition: childDef, targetInput: {} }),
        ),
      ],
    });

    const parentRunId = await createRun(dbKey, parentDef, {
      input: {},
      cwd: "/tmp",
      mode: "run",
    });

    await expect(gotoRunStep(dbKey, parentRunId, [0, 0], [parentDef, childDef])).rejects.toThrow(
      /No nested run yet/,
    );
  });

  it("errors on out-of-range indices", async () => {
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/goto-oob",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step("noop", async (): Promise<StepOutcome> => ({ status: "success" }), () => ({})),
      ],
    });
    const runId = await createRun(dbKey, definition, {
      input: {},
      cwd: "/tmp",
      mode: "run",
    });
    await expect(gotoRunStep(dbKey, runId, [5], [definition])).rejects.toThrow(/out of range/);
  });
});
