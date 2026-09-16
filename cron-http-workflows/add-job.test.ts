import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { CronAddJobWorkflowDefinition } from "./add-job.ts";

describe("cron/add-job (ported to the new engine)", () => {
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

  it("copies job/test templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "cron-add-job-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-cron" }, null, 2),
    );
    mkdirSync(path.join(cwd, "jobs", "notifications"), { recursive: true });

    const runId = await createRun(dbKey, CronAddJobWorkflowDefinition, {
      input: { path: "./jobs/notifications/send-reminders.ts" },
      cwd,
      mode: "script",
    });

    // Just the first step: the "copy" step, which physically writes the
    // templated job/test files. Later steps require a real, installed
    // `-cron`/`-jobs` package, so this test stops here.
    const { output, result } = advanceRun(dbKey, CronAddJobWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const jobPath = path.join(cwd, "jobs", "notifications", "send-reminders.ts");
    const testPath = path.join(cwd, "jobs", "notifications", "send-reminders.test.ts");
    expect(readFileSync(jobPath, "utf-8")).toContain("sendReminders");
    expect(readFileSync(testPath, "utf-8")).toContain("sendReminders");
  });

  it("skips upserting the sibling jobs trigger map when it doesn't exist yet", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "cron-add-job-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-cron" }, null, 2),
    );
    mkdirSync(path.join(cwd, "jobs", "notifications"), { recursive: true });
    // No sibling "../jobs" directory exists at all.

    const runId = await createRun(dbKey, CronAddJobWorkflowDefinition, {
      input: { path: "./jobs/notifications/send-reminders.ts" },
      cwd,
      mode: "script",
    });

    // First step (copy job/test files).
    {
      const { output, result } = advanceRun(dbKey, CronAddJobWorkflowDefinition, runId);
      await collectOutput(output);
      expect((await result).status).toBe("success");
    }
    // Second step: the skipIf-guarded upsert into the (nonexistent) jobs.ts — should
    // no-op successfully rather than erroring on the missing directory/file.
    {
      const { output, result } = advanceRun(dbKey, CronAddJobWorkflowDefinition, runId);
      await collectOutput(output);
      expect((await result).status).toBe("success");
    }
  });

  it("threads the input prompt into the job and test update-step prompts", () => {
    const context = {
      groupName: "notifications",
      targetName: "send-reminders",
      targetDir: "/repo",
      jobsDir: "/repo/../jobs",
      packageName: "@example/widgets-cron",
      serviceName: "widgets",
      organizationName: "example",
      sharedPackagePrefix: "@example/widgets",
      prompt: "enqueue the weekly digest email every Monday at 9am",
    };
    const jobStep = CronAddJobWorkflowDefinition.steps[2];
    const jobInput = jobStep.input({ context }) as { prompt: string };
    expect(jobInput.prompt).toContain(
      "Task: enqueue the weekly digest email every Monday at 9am",
    );

    const testStep = CronAddJobWorkflowDefinition.steps[4];
    const testInput = testStep.input({ context }) as { prompt: string };
    expect(testInput.prompt).toContain(
      "The job implements: enqueue the weekly digest email every Monday at 9am",
    );
  });
});
