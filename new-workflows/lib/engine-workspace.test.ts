import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import { runCallWorkflowStep, type CallWorkflowStepInput } from "./steps/call-workflow.ts";
import type { StepFn } from "./types.ts";
import type { WorkflowWorkspaceConfig } from "./workspace.ts";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  return (await execFileAsync("git", args, { cwd })).stdout.trim();
}

async function initRepo(dir: string): Promise<void> {
  await git(dir, ["init", "-q", "-b", "main"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "Test"]);
  writeFileSync(path.join(dir, "README.md"), "hello\n");
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-q", "-m", "initial"]);
}

/** Writes a file into the step's cwd and records where it actually ran. */
const writeHere: StepFn<{ file: string }> = async (input, ctx) => {
  writeFileSync(path.join(ctx.cwd, input.file), `${ctx.cwd}\n`);
  return { status: "success" };
};

describe("advanceRun with a workspace", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  it("runs steps (and nested workflows) in the clone and fast-forwards the checkout", async () => {
    const base = mkdtempSync(path.join(tmpdir(), "engine-workspace-"));
    const host = path.join(base, "host");
    await execFileAsync("mkdir", ["-p", host]);
    await initRepo(host);
    const workspace: WorkflowWorkspaceConfig = {
      hostRoot: host,
      root: path.join(base, "workspace", "repo"),
      installCommand: [],
    };

    const Child = defineWorkflow<Record<string, never>, Record<string, never>>({
      id: "test/child",
      description: "writes a file",
      context: () => ({}),
      steps: [step("command", writeHere, () => ({ file: "child.txt" }))],
    });
    const Parent = defineWorkflow<Record<string, never>, Record<string, never>>({
      id: "test/parent",
      description: "writes a file, then calls a child",
      context: () => ({}),
      steps: [
        step("command", writeHere, () => ({ file: "parent.txt" })),
        step<CallWorkflowStepInput, Record<string, never>>("call-workflow", runCallWorkflowStep, () => ({
          targetDefinition: Child,
          targetInput: {},
        })),
      ],
    });
    const runId = await createRun(dbKey, Parent, { input: {}, cwd: host, mode: "script" });

    for (let i = 0; i < 2; i++) {
      const { output, result } = advanceRun(dbKey, Parent, runId, { workspace });
      const logs = await collectOutput(output);
      expect((await result).status).toBe("success");
      expect(logs.map((l) => l.content).join("\n")).toContain("Synced back to your checkout");
    }

    // Both steps ran in the clone…
    expect(readFileSync(path.join(host, "parent.txt"), "utf8")).toBe(`${workspace.root}\n`);
    expect(readFileSync(path.join(host, "child.txt"), "utf8")).toBe(`${workspace.root}\n`);
    // …and their commits are on the checkout's branch, with a clean tree.
    expect((await git(host, ["log", "--format=%s"])).split("\n")).toHaveLength(3);
    expect(await git(host, ["rev-parse", "HEAD"])).toBe(await git(workspace.root, ["rev-parse", "HEAD"]));
    expect(await git(host, ["status", "--porcelain"])).toBe("");
    expect(existsSync(path.join(host, ".git", "saf-workspace.json"))).toBe(false);
  });
});
