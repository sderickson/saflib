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
  getByTurnIdWorkflowAgentTurnRaw,
} from "@saflib/new-workflows-db";
import { createRawOutputBuffer } from "./dispatch.ts";
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

  it("keeps each turn's raw CLI output alongside the turn", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "agent-raw-"));
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
    const outputs = await Promise.all(
      turns!.map(async (t) => (await getByTurnIdWorkflowAgentTurnRaw(dbKey, { turn_id: t.id })).result?.output),
    );
    expect(outputs).toHaveLength(4);
    expect(outputs.every((o) => o?.startsWith('{"type":"result"'))).toBe(true);
    expect(outputs.some((o) => o?.includes('"prompt":"child two"'))).toBe(true);
  });

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

describe("createRawOutputBuffer", () => {
  it("keeps everything under the cap", () => {
    const raw = createRawOutputBuffer(5, 5);
    raw.append("abc");
    raw.append("defg");
    expect(raw.read()).toEqual({ output: "abcdefg", omittedChars: 0 });
  });

  it("keeps the start and the end and counts what it cut from the middle", () => {
    const raw = createRawOutputBuffer(3, 3);
    raw.append("abcdef");
    raw.append("ghij");
    expect(raw.read()).toEqual({ output: "abc\n… 4 characters omitted …\nhij", omittedChars: 4 });
  });
});
