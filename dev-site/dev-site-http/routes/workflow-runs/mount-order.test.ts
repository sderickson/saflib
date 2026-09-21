import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
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

/**
 * Regression: `createWorkflowsRouter` mounts the whole `new-workflows-http`
 * router, which ends in its own catch-all `[notFoundHandler, errorHandler]`
 * for any unmatched `/api/*` path. Mounted before `createWorkflowRunsRouter`
 * in `defaultRouterMounts()`, it 404s `/api/workflow-runs/*` and
 * `/api/workflows/{id}/preview-diff` itself before Express ever reaches
 * this router's own handlers — invisible to a route test that (like the
 * ones in this same folder) mounts `createWorkflowRunsRouter` alone, so
 * this exercises the *real*, full default mount list instead.
 */
describe("workflow-runs preview routes, mounted alongside the real new-workflows-http router", () => {
  let lease: DevSiteHttpAppLease;
  let repo_root: string;

  beforeAll(() => {
    repo_root = mkdtempSync(join(tmpdir(), "dev-site-mount-order-"));
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);
    writeFileSync(join(repo_root, "package.json"), JSON.stringify({ name: "@fixture/root" }));
    git(repo_root, ["add", "-A"]);
    git(repo_root, ["commit", "-m", "base"]);

    // No `mounts` override — the real `defaultRouterMounts()` list.
    lease = createDevSiteHttpApp({ repo_root, mainRef: "main" });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repo_root, { recursive: true, force: true });
  });

  it("POST /api/workflows/:id/preview-diff is not swallowed by new-workflows-http's own catch-all", async () => {
    const response = await request(lease.app)
      .post(`/api/workflows/${encodeURIComponent(HelloWorkflowDefinition.id)}/preview-diff`)
      .send({ input: { name: "widget" } });
    expect(response.status).toBe(200);
  });

  it("still 404s (via this router's own handling, not new-workflows-http's) for a genuinely unknown workflow id", async () => {
    const response = await request(lease.app)
      .post("/api/workflows/no-such-workflow/preview-diff")
      .send({});
    expect(response.status).toBe(404);
  });

  it("GET /api/workflows still works (a real new-workflows-http route) — mount reordering didn't break it", async () => {
    const response = await request(lease.app).get("/api/workflows");
    expect(response.status).toBe(200);
    expect(
      response.body.workflows.some((w: { id: string }) => w.id === HelloWorkflowDefinition.id),
    ).toBe(true);
  });
});
