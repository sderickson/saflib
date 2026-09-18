import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import { createWorkflowRunsRouter } from "./index.ts";
import { createDevSiteHttpApp, type DevSiteHttpAppLease } from "../../http.ts";
import { releaseSlimRouteTest } from "../../testing/slim-route-test.ts";

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

describe("POST /api/workflows/:id/preview-diff", () => {
  let lease: DevSiteHttpAppLease;
  let repo_root: string;
  let baseHash: string;

  beforeAll(() => {
    repo_root = mkdtempSync(join(tmpdir(), "dev-site-preview-workflow-diff-route-"));
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);
    writeFileSync(join(repo_root, "package.json"), JSON.stringify({ name: "@fixture/root" }));
    mkdirSync(join(repo_root, "src"));
    git(repo_root, ["add", "-A"]);
    git(repo_root, ["commit", "-m", "base"]);
    baseHash = git(repo_root, ["rev-parse", "HEAD"]);

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

  it("previews a registered workflow with no run ever created — cwd defaults to the repo root", async () => {
    const response = await request(lease.app)
      .post(`/api/workflows/${encodeURIComponent(HelloWorkflowDefinition.id)}/preview-diff`)
      .send({ input: { name: "widget" } });

    expect(response.status).toBe(200);
    expect(response.body.commit_diff.from_hash).toBe(baseHash);
    expect(response.body.commit_diff.to_hash).not.toBe(baseHash);
    expect(
      response.body.commit_diff.exports.added.some(
        (e: { name: string }) => e.name === "widget",
      ),
    ).toBe(true);

    // The real repo is never touched.
    expect(git(repo_root, ["rev-parse", "HEAD"])).toBe(baseHash);
    expect(git(repo_root, ["status", "--porcelain"])).toBe("");
  });

  it("cwd can be overridden explicitly, same as a real run's would", async () => {
    const response = await request(lease.app)
      .post(`/api/workflows/${encodeURIComponent(HelloWorkflowDefinition.id)}/preview-diff`)
      .send({ input: { name: "gadget" }, cwd: join(repo_root, "src") });

    expect(response.status).toBe(200);
    const paths = response.body.commit_diff.exports.added.map(
      (e: { file_path: string }) => e.file_path,
    );
    expect(paths).toContain("src/gadget.ts");
  });

  it("404s for an unknown workflow id, without a 500", async () => {
    const response = await request(lease.app)
      .post("/api/workflows/no-such-workflow/preview-diff")
      .send({});
    expect(response.status).toBe(404);
  });
});
