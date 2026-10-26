import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { listByRunWorkflowStep } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import type { StepFn } from "./types.ts";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  return (await execFileAsync("git", args, { cwd })).stdout.trim();
}

async function initRepo(): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "unexpected-files-"));
  await git(dir, ["init"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "Test"]);
  writeFileSync(path.join(dir, "README.md"), "hello\n");
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-m", "initial"]);
  return dir;
}

/** Stands in for an agent edit: writes each file, relative to the run's cwd. */
const writeFiles: StepFn<{ files: string[] }> = async (input, ctx) => {
  for (const file of input.files) {
    const target = path.join(ctx.originalWorkingDirectory, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, `${file}\n`);
  }
  return { status: "success" };
};

describe("unexpected files", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  async function runAll(def: ReturnType<typeof defineWorkflow<any, any>>, cwd: string) {
    const runId = await createRun(dbKey, def, { input: {}, cwd, mode: "script" });
    const logs: string[] = [];
    for (let i = 0; i < def.steps.length; i++) {
      const { output, result } = advanceRun(dbKey, def, runId);
      logs.push(...(await collectOutput(output)).map((chunk) => chunk.content));
      expect((await result).status).toMatch(/success|done/);
    }
    const { result: steps } = await listByRunWorkflowStep(dbKey, { run_id: runId });
    return { steps: steps!, logs };
  }

  it("records files outside every step's declared files, on the step that changed them", async () => {
    const cwd = await initRepo();
    const def = defineWorkflow<Record<string, never>, Record<string, never>>({
      id: "plans/widgets/phase-1.workflow.yaml",
      description: "a plan phase",
      context: () => ({}),
      steps: [
        step("prompt", writeFiles, () => ({ files: ["app/spec/widget.yaml"] }), {
          expectedFiles: ["app/spec/**"],
        }),
        // A test step's fix: one file in the run's scope (declared by a
        // later step), one outside it.
        step("command", writeFiles, () => ({
          files: ["app/http/widget.ts", "app/security/vitest.config.js", "package-lock.json"],
        })),
        step("prompt", writeFiles, () => ({ files: [] }), { expectedFiles: ["app/http/widget.ts"] }),
      ],
    });

    const { steps, logs } = await runAll(def, cwd);

    expect(steps.map((s) => s.unexpected_files)).toEqual([
      null,
      ["app/security/vitest.config.js"],
      null,
    ]);
    expect(logs.join("\n")).toContain(
      "Changed files outside this run's expected files:\n- app/security/vitest.config.js",
    );
  });

  it("checks nothing when no step declares files", async () => {
    const cwd = await initRepo();
    const def = defineWorkflow<Record<string, never>, Record<string, never>>({
      id: "test/undeclared",
      description: "no scope",
      context: () => ({}),
      steps: [step("command", writeFiles, () => ({ files: ["anywhere.ts"] }))],
    });

    const { steps } = await runAll(def, cwd);

    expect(steps[0]!.unexpected_files).toBeNull();
  });
});
