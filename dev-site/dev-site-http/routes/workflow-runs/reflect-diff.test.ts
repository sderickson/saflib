import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { defineWorkflow, step, createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { createWorkflowRunsRouter } from "./index.ts";
import { createDevSiteHttpApp, type DevSiteHttpAppLease } from "../../http.ts";
import { releaseSlimRouteTest } from "../../testing/slim-route-test.ts";
import { getWorkflowsDbKey } from "../workflows/index.ts";

function git(repo_root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repo_root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  }).trim();
}

const oneStepDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
  id: "test/reflect-diff-fixture",
  description: "test",
  context: ({ input }) => input,
  steps: [
    step(
      "command",
      async (_input, ctx) => {
        writeFileSync(
          join(ctx.cwd, "generated.ts"),
          "export const generated = true;\n",
        );
        return { status: "success" };
      },
      () => ({ command: "true", args: [] }),
    ),
  ],
});

describe("GET /api/workflow-runs/:runId/reflect-diff", () => {
  let lease: DevSiteHttpAppLease;
  let repo_root: string;

  beforeAll(() => {
    repo_root = mkdtempSync(join(tmpdir(), "dev-site-reflect-diff-route-"));
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);
    writeFileSync(join(repo_root, "package.json"), JSON.stringify({ name: "@fixture/root" }));
    mkdirSync(join(repo_root, "src"));
    git(repo_root, ["add", "-A"]);
    git(repo_root, ["commit", "-m", "base"]);

    lease = createDevSiteHttpApp({
      repo_root,
      mainRef: "main",
      mounts: [{ kind: "router", createRouter: createWorkflowRunsRouter }],
    });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repo_root, { recursive: true, force: true });
  });

  it("is final and stable once the run is done, even after later unrelated commits", async () => {
    const cwd = join(repo_root, "src");
    const runId = await createRun(getWorkflowsDbKey(), oneStepDefinition, { input: {}, cwd, mode: "run" });
    const { output, result } = advanceRun(getWorkflowsDbKey(), oneStepDefinition, runId);
    await collectOutput(output);
    await result;

    const response = await request(lease.app).get(`/api/workflow-runs/${runId}/reflect-diff`);
    expect(response.status).toBe(200);
    expect(response.body.is_final).toBe(true);
    expect(
      response.body.commit_diff.exports.added.some(
        (e: { name: string }) => e.name === "generated",
      ),
    ).toBe(true);

    // Later, unrelated work landing in the repo doesn't change the reflection.
    writeFileSync(join(repo_root, "later.txt"), "later\n");
    git(repo_root, ["add", "-A"]);
    git(repo_root, ["commit", "-m", "later, unrelated"]);

    const responseAfter = await request(lease.app).get(
      `/api/workflow-runs/${runId}/reflect-diff`,
    );
    expect(responseAfter.body.commit_diff.to_hash).toBe(response.body.commit_diff.to_hash);
  });

  it("409s for a run with no base_commit_hash (cwd never resolved inside a git repo)", async () => {
    const nonGitCwd = mkdtempSync(join(tmpdir(), "dev-site-reflect-diff-no-git-"));
    const runId = await createRun(getWorkflowsDbKey(), oneStepDefinition, {
      input: {},
      cwd: nonGitCwd,
      mode: "run",
    });

    const response = await request(lease.app).get(`/api/workflow-runs/${runId}/reflect-diff`);
    expect(response.status).toBe(409);
  });

  it("404s for an unknown run id", async () => {
    const response = await request(lease.app).get(
      "/api/workflow-runs/no-such-run/reflect-diff",
    );
    expect(response.status).toBe(404);
  });
});
