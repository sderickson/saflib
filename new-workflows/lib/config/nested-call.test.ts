import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun, getChildByParentStepWorkflowRun } from "@saflib/new-workflows-db";
import { validateWorkflowConfigBody } from "./validate.ts";
import { compileConfigWorkflow } from "./compile.ts";
import { createRun, advanceRun } from "../engine.ts";
import { collectOutput } from "../output.ts";
import { HelloWorkflowDefinition } from "../example-workflows/hello-workflow.ts";

/**
 * Proves a config workflow can drive a real code-defined workflow as a
 * nested child run, entirely through the *root* run's own `advanceRun`
 * calls — the caller never needs to know a child run exists.
 */
describe("call-workflow (config -> code, nested)", () => {
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

  it("runs the nested workflow to completion via the root run alone", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "nested-call-"));
    const { result: body } = validateWorkflowConfigBody({
      name: "Delegate to hello",
      steps: [
        { kind: "call-workflow", workflowId: "example/hello", input: { name: "example-thing" } },
      ],
    });
    expect(body).toBeDefined();

    const definition = compileConfigWorkflow("test/call-hello", body!, {
      "example/hello": HelloWorkflowDefinition,
    });

    const runId = await createRun(dbKey, definition, {
      input: {},
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });

    let outcome;
    for (let i = 0; i < 10; i++) {
      const { output, result } = advanceRun(dbKey, definition, runId);
      await collectOutput(output);
      outcome = await result;
      if (outcome.status !== "success") break;
    }

    expect(outcome).toEqual({ status: "done" });

    const { result: root } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(root?.status).toBe("done");

    const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: 0,
    });
    expect(child).toBeDefined();
    expect(child?.workflow_ref).toBe("example/hello");
    expect(child?.status).toBe("done");

    const generatedPath = path.join(cwd, "example-thing.ts");
    expect(existsSync(generatedPath)).toBe(true);
    expect(readFileSync(generatedPath, "utf-8")).toContain("exampleThing");
  });
});
