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

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
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

describe("POST /scan", () => {
  let lease: DevSiteHttpAppLease;
  let repoRoot: string;
  let commitHash: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "dev-site-scan-route-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);
    writeFileSync(
      join(repoRoot, "package.json"),
      JSON.stringify({ name: "@fixture/scan" }),
    );
    mkdirSync(join(repoRoot, "src"));
    writeFileSync(join(repoRoot, "src/a.ts"), "export const a = 1;\n");
    git(repoRoot, ["add", "."]);
    git(repoRoot, ["commit", "-m", "init"]);
    commitHash = git(repoRoot, ["rev-parse", "HEAD"]);

    lease = createDevSiteHttpApp({
      repoRoot,
      mainRef: "main",
      mounts: [{ kind: "router", createRouter: createScanRouter }],
    });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repoRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    devSiteDbManager.clearAllTablesForTests(lease.devSiteDbKey);
  });

  it("scans and returns newly ingested hashes", async () => {
    const response = await request(lease.app)
      .post("/scan")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.scanned).toEqual([commitHash]);
    expect(response.body.skipped).toEqual([]);
    expect(response.body.failed).toEqual([]);
  });

  it("skips already-scanned commits on a second call", async () => {
    await request(lease.app).post("/scan").send({});
    const response = await request(lease.app).post("/scan").send({});
    expect(response.status).toBe(200);
    expect(response.body.scanned).toEqual([]);
    // No new candidates after the latest hash → empty skipped set.
    expect(response.body.skipped).toEqual([]);
    expect(response.body.failed).toEqual([]);
  });
});
