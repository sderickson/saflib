import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
} from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createScanRouter } from "./index.ts";
import { createDevSiteHttpApp } from "../../http.ts";
import { releaseSlimRouteTest } from "../../testing/slim-route-test.ts";
import type { DevSiteHttpAppLease } from "../../http.ts";
import { devSiteDbManager } from "@saflib/dev-site-db/instances";
import { enqueueScan, waitForScanJob } from "../../scan-dispatch.ts";

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

describe("scan jobs API", () => {
  let lease: DevSiteHttpAppLease;
  let repo_root: string;
  let commit_hash: string;

  beforeAll(() => {
    repo_root = mkdtempSync(join(tmpdir(), "dev-site-scan-route-"));
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);
    writeFileSync(
      join(repo_root, "package.json"),
      JSON.stringify({ name: "@fixture/scan" }),
    );
    mkdirSync(join(repo_root, "src"));
    writeFileSync(join(repo_root, "src/a.ts"), "export const a = 1;\n");
    git(repo_root, ["add", "."]);
    git(repo_root, ["commit", "-m", "init"]);
    commit_hash = git(repo_root, ["rev-parse", "HEAD"]);

    lease = createDevSiteHttpApp({
      repo_root,
      mainRef: "main",
      mounts: [{ kind: "router", createRouter: createScanRouter }],
    });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repo_root, { recursive: true, force: true });
  });

  beforeEach(() => {
    devSiteDbManager.clearAllTablesForTests(lease.devSiteDbKey);
  });

  async function scanToCompletion(body: object) {
    const response = await request(lease.app).post("/api/scan").send(body);
    expect(response.status).toBe(202);
    return waitForScanJob(lease.devSiteDbKey, response.body.scan_job.id);
  }

  it("queues a job that ingests new commits", async () => {
    const job = await scanToCompletion({ limit: 5 });
    expect(job.status).toBe("complete");
    expect(job.result?.scanned).toEqual([commit_hash]);
    expect(job.result?.skipped).toEqual([]);
    expect(job.result?.failed).toEqual([]);
  });

  it("skips already-scanned commits on a second job", async () => {
    await scanToCompletion({ limit: 5 });
    const job = await scanToCompletion({ limit: 5 });
    expect(job.status).toBe("complete");
    expect(job.result?.scanned).toEqual([]);
    expect(job.result?.skipped).toEqual([commit_hash]);
  });

  it("returns the active job for a duplicate request", async () => {
    const options = { repo_root, mainRef: "main", commit_hash };
    const first = enqueueScan(lease.devSiteDbKey, options);
    const second = enqueueScan(lease.devSiteDbKey, options);
    expect(second.id).toBe(first.id);
    await waitForScanJob(lease.devSiteDbKey, first.id);
  });

  it("lists jobs with their final progress, newest first", async () => {
    const job = await scanToCompletion({ commit_hash });
    const response = await request(lease.app).get("/api/scan/jobs");
    expect(response.status).toBe(200);
    const listed = response.body.scan_jobs[0];
    expect(listed.id).toBe(job.id);
    expect(listed.status).toBe("complete");
    expect(listed.progress).toMatchObject({
      commit_hash,
      phase: "save",
      phase_index: 5,
      phase_count: 5,
    });
  });
});
