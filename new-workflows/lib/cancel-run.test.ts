import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun } from "./engine.ts";
import { HelloWorkflowDefinition } from "./example-workflows/hello-workflow.ts";
import { registerActiveAgentProcess } from "./agents/registry.ts";
import { cancelRunAndDescendants } from "./cancel-run.ts";

/**
 * A run whose current step is `call-workflow` never registers its own
 * agent process — it's just blocked awaiting the nested child's
 * `advanceRun`. Reproduces exactly what a "Stop" button click on the
 * *root* run of a plan does in dev-site: the parent/child link is
 * constructed directly (same `parentRunId`/`parentStepIndex` fields
 * `runCallWorkflowStep` sets) rather than actually driving a nested run
 * through an agent turn, since a real one resolves before a test could
 * ever register a handle mid-flight.
 */
describe("cancelRunAndDescendants", () => {
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

  it("walks down to the nested child actually running an agent and cancels it", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "cancel-run-"));
    const rootRunId = await createRun(dbKey, HelloWorkflowDefinition, {
      input: { name: "root" },
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });
    const childRunId = await createRun(dbKey, HelloWorkflowDefinition, {
      input: { name: "child" },
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      parentRunId: rootRunId,
      parentStepIndex: 0,
    });

    const kill = vi.fn();
    registerActiveAgentProcess(childRunId, { kill });

    const cancelled = await cancelRunAndDescendants(dbKey, rootRunId);

    expect(cancelled).toBe(true);
    expect(kill).toHaveBeenCalledOnce();
  });

  it("walks through multiple nesting levels to find the leaf with an agent", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "cancel-run-"));
    const rootRunId = await createRun(dbKey, HelloWorkflowDefinition, {
      input: { name: "root" },
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });
    const midRunId = await createRun(dbKey, HelloWorkflowDefinition, {
      input: { name: "mid" },
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      parentRunId: rootRunId,
      parentStepIndex: 0,
    });
    const leafRunId = await createRun(dbKey, HelloWorkflowDefinition, {
      input: { name: "leaf" },
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      parentRunId: midRunId,
      parentStepIndex: 0,
    });

    const kill = vi.fn();
    registerActiveAgentProcess(leafRunId, { kill });

    expect(await cancelRunAndDescendants(dbKey, rootRunId)).toBe(true);
    expect(kill).toHaveBeenCalledOnce();
  });

  it("returns false when no run in the chain has an agent registered", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "cancel-run-"));
    const runId = await createRun(dbKey, HelloWorkflowDefinition, {
      input: { name: "example-thing" },
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });

    expect(await cancelRunAndDescendants(dbKey, runId)).toBe(false);
  });

  it("returns false for an unknown run id", async () => {
    expect(await cancelRunAndDescendants(dbKey, "no-such-run")).toBe(false);
  });
});
