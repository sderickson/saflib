import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import {
  getByIdWorkflowRun,
  getChildByParentStepWorkflowRun,
  listBySessionRunWorkflowAgentTurn,
  listByRunWorkflowStep,
} from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "../engine.ts";
import { collectOutput } from "../output.ts";
import type { LogChunk } from "../types.ts";
import { runPromptStep, type PromptStepInput } from "../steps/prompt.ts";
import { runCallWorkflowStep, type CallWorkflowStepInput } from "../steps/call-workflow.ts";

const ChildDefinition = defineWorkflow<Record<string, never>, Record<string, never>>({
  id: "test/child",
  description: "two agent turns",
  context: () => ({}),
  steps: [
    step<PromptStepInput, Record<string, never>>("prompt", runPromptStep, () => ({
      prompt: "child one",
    })),
    step<PromptStepInput, Record<string, never>>("prompt", runPromptStep, () => ({
      prompt: "child two",
    })),
  ],
});

const ParentDefinition = defineWorkflow<Record<string, never>, Record<string, never>>({
  id: "test/parent",
  description: "agent turn, nested call, agent turn",
  context: () => ({}),
  steps: [
    step<PromptStepInput, Record<string, never>>("prompt", runPromptStep, () => ({
      prompt: "parent one",
    })),
    step<CallWorkflowStepInput, Record<string, never>>("call-workflow", runCallWorkflowStep, () => ({
      targetDefinition: ChildDefinition,
      targetInput: {},
    })),
    step<PromptStepInput, Record<string, never>>("prompt", runPromptStep, () => ({
      prompt: "parent two",
    })),
  ],
});

describe("runAgentTurn", () => {
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

  async function runToEnd(runId: string): Promise<LogChunk[]> {
    const chunks: LogChunk[] = [];
    for (let i = 0; i < 10; i++) {
      const { output, result } = advanceRun(dbKey, ParentDefinition, runId);
      chunks.push(...(await collectOutput(output)));
      const outcome = await result;
      if (outcome.status === "done") return chunks;
      expect(outcome.status).toBe("success");
    }
    throw new Error("run never finished");
  }

  it("resumes one agent session across every step of the run, nested children included", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "agent-session-"));
    const runId = await createRun(dbKey, ParentDefinition, {
      input: {},
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });

    await runToEnd(runId);

    const { result: turns } = await listBySessionRunWorkflowAgentTurn(dbKey, {
      session_run_id: runId,
    });
    expect(turns).toHaveLength(4);
    const sessionId = turns![0].session_id;
    expect(sessionId).toBeTruthy();
    expect(turns![0].resumed_session_id).toBeNull();
    for (const turn of turns!.slice(1)) {
      expect(turn.resumed_session_id).toBe(sessionId);
      expect(turn.session_id).toBe(sessionId);
    }
    expect(turns!.every((t) => t.status === "success" && t.cli === "mock-agent")).toBe(true);

    const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: 1,
    });
    expect(turns!.map((t) => t.run_id)).toEqual([runId, child!.id, child!.id, runId]);

    const { result: root } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(root!.agent_config).toEqual({ cli: "mock-agent", sessionId });
  });

  it("stamps logs with the run and step that produced them, and labels finished steps", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "agent-session-"));
    const runId = await createRun(dbKey, ParentDefinition, {
      input: {},
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });

    const chunks = await runToEnd(runId);
    const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: 1,
    });

    const childTwo = chunks.find((c) => c.channel === "agent" && c.content === "child two");
    expect(childTwo).toMatchObject({ sourceRunId: child!.id, sourceStepIndex: 1 });
    const parentTwo = chunks.find((c) => c.channel === "agent" && c.content === "parent two");
    expect(parentTwo).toMatchObject({ sourceRunId: runId, sourceStepIndex: 2 });

    const { result: steps } = await listByRunWorkflowStep(dbKey, { run_id: runId });
    expect(steps!.map((s) => s.label)).toEqual(["parent one", "test/child", "parent two"]);
  });

  it("falls back to the run's own agentConfig without a usable db", async () => {
    const { makeTestContext } = await import("../test-helpers.ts");
    const { runAgentTurn } = await import("./dispatch.ts");
    const { ctx } = makeTestContext({ mode: "run", agentConfig: { cli: "mock-agent" } });

    const first = await runAgentTurn("one", ctx);
    const second = await runAgentTurn("two", ctx);

    expect(first.sessionId).toBeTruthy();
    expect(second.sessionId).toBe(first.sessionId);
  });
});
