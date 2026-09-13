import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { validateWorkflowConfigBody } from "./validate.ts";
import { compileConfigWorkflow } from "./compile.ts";
import { createRun, advanceRun } from "../engine.ts";
import { collectOutput } from "../output.ts";
import { HelloWorkflowDefinition } from "../example-workflows/hello-workflow.ts";

/**
 * Proves the transparency claim: in `print` mode, a caller driving only
 * the root run sees exactly the nested child's `awaiting_prompt`, with no
 * indication a call happened at all — and resuming the root correctly
 * resumes the nested child too (each nested `advanceRun` computes its own
 * `isResume` from its own run's step history).
 */
describe("call-workflow (config -> code, nested, print mode)", () => {
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

  it("bubbles the nested awaiting_prompt, and resumes correctly", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "nested-call-print-"));
    const { result: body } = validateWorkflowConfigBody({
      name: "Delegate to hello",
      steps: [
        { kind: "call-workflow", workflowId: "example/hello", input: { name: "example-thing" } },
      ],
    });
    const definition = compileConfigWorkflow("test/call-hello-print", body!, {
      "example/hello": HelloWorkflowDefinition,
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "print" });

    // First advance: the nested workflow's copy step runs (no prompt yet),
    // then its update step halts on a prompt — bubbled straight up.
    const first = advanceRun(dbKey, definition, runId);
    await collectOutput(first.output);
    const firstOutcome = await first.result;
    expect(firstOutcome.status).toBe("awaiting_prompt");
    if (firstOutcome.status === "awaiting_prompt") {
      expect(firstOutcome.prompt).toContain("Take a look at the generated file");
    }

    const { result: rootAfterFirst } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(rootAfterFirst?.status).toBe("awaiting_prompt");
    // Root's own step index never moved — it's still "on" the call-workflow step.
    expect(rootAfterFirst?.current_step_index).toBe(0);

    // Resume: should drive the nested child's update step to success, then
    // its command step, then finish — all from calling advanceRun on the
    // ROOT alone, same as a non-nested resume.
    let outcome;
    for (let i = 0; i < 10; i++) {
      const { output, result } = advanceRun(dbKey, definition, runId);
      await collectOutput(output);
      outcome = await result;
      if (outcome.status !== "success") break;
    }
    expect(outcome).toEqual({ status: "done" });

    expect(existsSync(path.join(cwd, "example-thing.ts"))).toBe(true);
  });
});
