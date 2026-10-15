import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getChildByParentStepWorkflowRun, listByRunWorkflowStep } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import { runCallWorkflowStep, type CallWorkflowStepInput } from "./steps/call-workflow.ts";
import type { StepFn } from "./types.ts";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  return (await execFileAsync("git", args, { cwd })).stdout.trim();
}

async function initRepo(): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "commit-message-"));
  await git(dir, ["init"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "Test"]);
  writeFileSync(path.join(dir, "README.md"), "hello\n");
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-m", "initial"]);
  return dir;
}

/** A step that writes one file — stands in for an agent edit. */
const writeFile: StepFn<{ file: string }> = async (input, ctx) => {
  writeFileSync(path.join(ctx.cwd, input.file), `${input.file}\n`);
  return { status: "success" };
};

describe("step commits", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  it("addresses nested commits within their plan phase, with trailers and a commit_hash back-link", async () => {
    const cwd = await initRepo();
    const Child = defineWorkflow<{ name: string }, Record<string, never>>({
      id: "test/add-thing",
      description: "writes a file",
      context: () => ({}),
      steps: [step("command", writeFile, () => ({ file: "thing.ts" }))],
    });
    const Phase = defineWorkflow<Record<string, never>, Record<string, never>>({
      id: "plans/notes/2026-10-15-widgets/phase-3-things.workflow.yaml",
      description: "a plan phase",
      context: () => ({}),
      steps: [
        step("command", writeFile, () => ({ file: "first.ts" })),
        step<CallWorkflowStepInput, Record<string, never>>("call-workflow", runCallWorkflowStep, () => ({
          targetDefinition: Child,
          targetInput: { name: "sprocket" },
        })),
      ],
    });
    const runId = await createRun(dbKey, Phase, { input: {}, cwd, mode: "script" });

    for (let i = 0; i < 2; i++) {
      const { output, result } = advanceRun(dbKey, Phase, runId);
      await collectOutput(output);
      expect((await result).status).toBe("success");
    }

    const subjects = (await git(cwd, ["log", "--format=%s", "-3"])).split("\n");
    expect(subjects[0]).toMatch(/^widgets 3\.2\.1 test\/add-thing\(sprocket\) /);
    expect(subjects[1]).toMatch(/^widgets 3\.1 /);

    const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
      parent_run_id: runId,
      parent_step_index: 1,
    });
    const trailers = await git(cwd, ["log", "-1", "--format=%(trailers:only,unfold)"]);
    expect(trailers.split("\n")).toEqual([
      "Workflow-Plan: plans/notes/2026-10-15-widgets",
      `Workflow-Run: ${runId}`,
      "Workflow-Step: 3.2.1",
      `Workflow-Source-Run: ${child!.id}`,
      "Workflow-Source: test/add-thing",
    ]);
    expect(await git(cwd, ["log", "--format=%s", `--grep=Workflow-Run: ${runId}`])).toContain(
      "widgets 3.1",
    );

    const { result: childSteps } = await listByRunWorkflowStep(dbKey, { run_id: child!.id });
    expect(childSteps![0].commit_hash).toBe(await git(cwd, ["rev-parse", "HEAD"]));
    const { result: phaseSteps } = await listByRunWorkflowStep(dbKey, { run_id: runId });
    expect(phaseSteps![0].commit_hash).toBe(await git(cwd, ["rev-parse", "HEAD~1"]));
    // The call-workflow step itself had nothing left to commit.
    expect(phaseSteps![1].commit_hash).toBeNull();
  });
});
