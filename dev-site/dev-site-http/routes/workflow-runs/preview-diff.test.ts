import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { HelloWorkflowDefinition, createRun } from "@saflib/new-workflows";
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

describe("GET /api/workflow-runs/:runId/preview-diff", () => {
  let lease: DevSiteHttpAppLease;
  let repo_root: string;
  let baseHash: string;
  let runId: string;

  beforeAll(async () => {
    repo_root = mkdtempSync(join(tmpdir(), "dev-site-preview-diff-route-"));
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);
    writeFileSync(join(repo_root, "package.json"), JSON.stringify({ name: "@fixture/root" }));
    mkdirSync(join(repo_root, "src"));
    writeFileSync(join(repo_root, "src/existing.ts"), "export const existing = true;\n");
    git(repo_root, ["add", "-A"]);
    git(repo_root, ["commit", "-m", "base"]);
    baseHash = git(repo_root, ["rev-parse", "HEAD"]);

    runId = await createRun(getWorkflowsDbKey(), HelloWorkflowDefinition, {
      input: { name: "widget" },
      cwd: join(repo_root, "src"),
      mode: "run",
    });

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

  it("diffs the run's would-be copy step output against HEAD, and reports the update/command steps as skipped", async () => {
    const response = await request(lease.app).get(`/api/workflow-runs/${runId}/preview-diff`);

    expect(response.status).toBe(200);
    expect(response.body.commit_diff.from_hash).toBe(baseHash);
    expect(response.body.commit_diff.to_hash).not.toBe(baseHash);
    expect(
      response.body.commit_diff.exports.added.some(
        (e: { name: string }) => e.name === "widget",
      ),
    ).toBe(true);

    const kinds = response.body.entries.map((e: { kind: string; applied: boolean }) => ({
      kind: e.kind,
      applied: e.applied,
    }));
    expect(kinds).toEqual([
      { kind: "copy", applied: true },
      { kind: "update", applied: false },
      { kind: "command", applied: false },
    ]);

    // The real repo is never touched.
    expect(git(repo_root, ["rev-parse", "HEAD"])).toBe(baseHash);
    expect(git(repo_root, ["status", "--porcelain"])).toBe("");
  });

  it("404s for an unknown run id", async () => {
    const response = await request(lease.app).get(
      "/api/workflow-runs/no-such-run/preview-diff",
    );
    expect(response.status).toBe(404);
  });
});
