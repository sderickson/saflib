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

describe("POST /api/scan", () => {
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

  it("scans and returns newly ingested hashes", async () => {
    const response = await request(lease.app)
      .post("/api/scan")
      .send({ limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body.scanned).toEqual([commit_hash]);
    expect(response.body.skipped).toEqual([]);
    expect(response.body.failed).toEqual([]);
  });

  it("skips already-scanned commits on a second call", async () => {
    await request(lease.app).post("/api/scan").send({ limit: 5 });
    const response = await request(lease.app).post("/api/scan").send({ limit: 5 });
    expect(response.status).toBe(200);
    expect(response.body.scanned).toEqual([]);
    expect(response.body.skipped).toEqual([commit_hash]);
    expect(response.body.failed).toEqual([]);
  });
});
