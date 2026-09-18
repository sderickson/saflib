import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";

const execFileAsync = promisify(execFile);

async function initRepo(): Promise<{ dir: string; headHash: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), "create-run-base-hash-"));
  await execFileAsync("git", ["init"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: dir });
  writeFileSync(path.join(dir, "README.md"), "hello\n");
  await execFileAsync("git", ["add", "-A"], { cwd: dir });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: dir });
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: dir });
  return { dir, headHash: stdout.trim() };
}

const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
  id: "test/base-commit-hash",
  description: "test",
  context: ({ input }) => input,
  steps: [],
});

describe("createRun captures base_commit_hash", () => {
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

  it("stores the repo's HEAD hash when cwd is inside a git repo", async () => {
    const { dir, headHash } = await initRepo();
    const runId = await createRun(dbKey, definition, { input: {}, cwd: dir, mode: "run" });
    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run!.base_commit_hash).toBe(headHash);
  });

  it("is null (not a thrown error) when cwd isn't inside a git repo", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "create-run-no-git-"));
    const runId = await createRun(dbKey, definition, { input: {}, cwd: dir, mode: "run" });
    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run!.base_commit_hash).toBeNull();
  });
});

describe("advanceRun captures completion_hash once a run reaches done", () => {
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

  it("is HEAD at the moment the run finishes, not wherever HEAD ends up later", async () => {
    const { dir } = await initRepo();
    const oneStepDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/completion-hash",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step("command", async () => ({ status: "success" }), () => ({ command: "true", args: [] })),
      ],
    });

    const runId = await createRun(dbKey, oneStepDefinition, { input: {}, cwd: dir, mode: "run" });
    const { output, result } = advanceRun(dbKey, oneStepDefinition, runId);
    await collectOutput(output);
    await result;

    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run!.status).toBe("done");
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: dir });
    expect(run!.completion_hash).toBe(stdout.trim());

    // Later, unrelated work landing shouldn't move an already-set completion_hash.
    writeFileSync(path.join(dir, "later.txt"), "later\n");
    await execFileAsync("git", ["add", "-A"], { cwd: dir });
    await execFileAsync("git", ["commit", "-m", "later, unrelated"], { cwd: dir });
    const { result: runAfterLaterWork } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(runAfterLaterWork!.completion_hash).toBe(run!.completion_hash);
  });

  it("stays null for a run that never reaches done", async () => {
    const { dir } = await initRepo();
    const failingDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/completion-hash-failure",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step("command", async () => ({ status: "error", message: "nope" }), () => ({
          command: "true",
          args: [],
        })),
      ],
    });

    const runId = await createRun(dbKey, failingDefinition, { input: {}, cwd: dir, mode: "run" });
    const { output, result } = advanceRun(dbKey, failingDefinition, runId);
    await collectOutput(output);
    await result;

    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run!.status).toBe("failed");
    expect(run!.completion_hash).toBeNull();
  });
});
