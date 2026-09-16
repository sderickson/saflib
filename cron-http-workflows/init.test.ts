import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { CronInitWorkflowDefinition } from "./init.ts";

describe("cron/init (ported to the new engine)", () => {
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

  it("copies the cron package stub when no cron package exists yet", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "cron-init-"));

    const runId = await createRun(dbKey, CronInitWorkflowDefinition, {
      input: {},
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step — "cd"/"command" that follow need a real
    // installable package tree to run against.
    const { output, result } = advanceRun(dbKey, CronInitWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    expect(existsSync(path.join(cwd, "service", "cron", "package.json"))).toBe(true);
    expect(existsSync(path.join(cwd, "service", "cron", "cron.ts"))).toBe(true);
  });
});
