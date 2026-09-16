import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { JobsAddJobWorkflowDefinition } from "./add-job.ts";

describe("jobs/add-job (ported to the new engine)", () => {
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

  it("copies the jobs.ts trigger-map template into the sibling jobs dir", async () => {
    // cwd is an offshoot http package directly under the product root (e.g.
    // "<product>/http"); the shared jobs package lives at "<product>/service/jobs".
    const productRoot = mkdtempSync(path.join(tmpdir(), "jobs-add-job-"));
    const cwd = path.join(productRoot, "http");
    mkdirSync(cwd, { recursive: true });
    mkdirSync(path.join(productRoot, "service", "jobs"), { recursive: true });

    const runId = await createRun(dbKey, JobsAddJobWorkflowDefinition, {
      input: { callerOperationId: "startDemo", targetOperationId: "demoStepB" },
      cwd,
      mode: "script",
    });

    // Just the first step: the "copy" step, which upserts the trigger-map
    // template into the sibling jobs package. Later steps require a real,
    // installed `-jobs` package, so this test stops here.
    const { output, result } = advanceRun(dbKey, JobsAddJobWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const jobsPath = path.join(productRoot, "service", "jobs", "jobs.ts");
    expect(readFileSync(jobsPath, "utf-8")).toBeTruthy();
  });
});
