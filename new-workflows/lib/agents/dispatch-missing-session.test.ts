import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun, listBySessionRunWorkflowAgentTurn } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "../engine.ts";
import { collectOutput } from "../output.ts";
import { makeTestContext } from "../test-helpers.ts";
import { runPromptStep, type PromptStepInput } from "../steps/prompt.ts";
import { AgentExitedWithoutResultError, executePromptWithClaude } from "./claude-agent.ts";

// Same approach as agent-cwd.test.ts — a real fake `claude` on PATH rather
// than `vi.mock` (this suite runs with `isolate: false`).

const originalPath = process.env.PATH;

afterEach(() => {
  process.env.PATH = originalPath;
});

function installFakeClaude(script: string): void {
  const binDir = mkdtempSync(path.join(tmpdir(), "fake-claude-bin-"));
  const scriptPath = path.join(binDir, "claude");
  writeFileSync(scriptPath, `#!/bin/sh\n${script}\n`);
  chmodSync(scriptPath, 0o755);
  process.env.PATH = `${binDir}:${originalPath}`;
}

/** Behaves like `claude` after its session store was wiped: `--resume` of anything fails. */
const FORGETFUL_CLAUDE = `
case "$*" in
  *--resume*)
    echo "No conversation found with session ID: gone" >&2
    exit 1
    ;;
esac
echo '{"type":"system","subtype":"init","session_id":"fresh","model":"claude-test"}'
echo '{"type":"result","subtype":"success","is_error":false,"session_id":"fresh","num_turns":2,"duration_api_ms":1500,"total_cost_usd":0.01,"usage":{"input_tokens":5,"output_tokens":7}}'
`;

describe("claude-agent without a result event", () => {
  it("rejects instead of hanging", async () => {
    installFakeClaude('echo "boom" >&2\nexit 3');
    const { ctx } = makeTestContext({ mode: "run", cwd: tmpdir() });

    const error = await executePromptWithClaude("go", ctx).catch((e) => e);

    expect(error).toBeInstanceOf(AgentExitedWithoutResultError);
    expect(error.exitCode).toBe(3);
    expect(error.message).toContain("boom");
  });
});

describe("runAgentTurn with a stale session", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  it("starts a fresh session when the stored one no longer exists, and records both turns", async () => {
    installFakeClaude(FORGETFUL_CLAUDE);
    const definition = defineWorkflow({
      id: "test/one-prompt",
      description: "one agent turn",
      context: () => ({}),
      steps: [
        step<PromptStepInput, unknown>("prompt", runPromptStep, () => ({ prompt: "go" })),
      ],
    });
    const runId = await createRun(dbKey, definition, {
      input: {},
      cwd: mkdtempSync(path.join(tmpdir(), "stale-session-")),
      mode: "run",
      agentConfig: { cli: "claude-agent", sessionId: "gone" },
    });

    const { output, result } = advanceRun(dbKey, definition, runId);
    const chunks = await collectOutput(output);
    expect(await result).toEqual({ status: "success" });
    expect(chunks.some((c) => c.level === "warn" && c.content.includes("gone"))).toBe(true);

    const { result: turns } = await listBySessionRunWorkflowAgentTurn(dbKey, {
      session_run_id: runId,
    });
    expect(turns!.map((t) => [t.status, t.resumed_session_id, t.session_id])).toEqual([
      ["error", "gone", null],
      ["success", null, "fresh"],
    ]);
    expect(turns![1]).toMatchObject({
      model: "claude-test",
      num_turns: 2,
      api_duration_ms: 1500,
      cost_usd: 0.01,
      input_tokens: 5,
      output_tokens: 7,
      prompt_chars: 2,
    });

    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run!.agent_config).toEqual({ cli: "claude-agent", sessionId: "fresh" });
  });
});
