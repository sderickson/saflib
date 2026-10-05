import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { JobsInitWorkflowDefinition } from "./init.ts";

describe("jobs/init (ported to the new engine)", () => {
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

  it("copies the jobs package stub when no jobs package exists yet", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "jobs-init-"));

    const runId = await createRun(dbKey, JobsInitWorkflowDefinition, {
      input: {},
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step — "cd"/"command"/"prompt" that follow
    // need a real installable package tree to run against.
    const { output, result } = advanceRun(dbKey, JobsInitWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    expect(existsSync(path.join(cwd, "service", "jobs", "package.json"))).toBe(true);
    expect(existsSync(path.join(cwd, "service", "jobs", "jobs.ts"))).toBe(true);
  });
});
