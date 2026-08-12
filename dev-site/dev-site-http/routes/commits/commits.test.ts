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
import { throwError } from "@saflib/monorepo";
import { createCommitsRouter } from "./index.ts";
import { createDevSiteHttpApp } from "../../http.ts";
import { releaseSlimRouteTest } from "../../testing/slim-route-test.ts";
import type { DevSiteHttpAppLease } from "../../http.ts";
import { devSiteDbManager } from "@saflib/dev-site-db/instances";
import { scanCommits } from "../../scan.ts";

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

describe("commits routes", () => {
  let lease: DevSiteHttpAppLease;
  let repoRoot: string;
  let commit1: string;
  let commit2: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "dev-site-commits-route-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);
    writeFileSync(
      join(repoRoot, "package.json"),
      JSON.stringify({ name: "@fixture/root" }),
    );
    mkdirSync(join(repoRoot, "src"));
    writeFileSync(
      join(repoRoot, "src/math.ts"),
      "export function add(a: number, b: number) { return a + b; }\n",
    );
    writeFileSync(
      join(repoRoot, "src/math.test.ts"),
      'import { describe, it } from "vitest";\ndescribe("math", () => {\n  it("adds", () => {});\n});\n',
    );
    git(repoRoot, ["add", "."]);
    execFileSync("git", ["commit", "-m", "first"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.com",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.com",
        GIT_AUTHOR_DATE: "2026-01-01T12:00:00Z",
        GIT_COMMITTER_DATE: "2026-01-01T12:00:00Z",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    commit1 = git(repoRoot, ["rev-parse", "HEAD"]);

    writeFileSync(
      join(repoRoot, "src/math.ts"),
      "export function add(a: number, b: number) { return a + b; }\nexport const ZERO = 0;\n",
    );
    writeFileSync(
      join(repoRoot, "src/math.test.ts"),
      'import { describe, it } from "vitest";\ndescribe("math", () => {\n  it("adds", () => {});\n  it("zero", () => {});\n});\n',
    );
    git(repoRoot, ["add", "."]);
    execFileSync("git", ["commit", "-m", "second"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.com",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.com",
        GIT_AUTHOR_DATE: "2026-01-02T12:00:00Z",
        GIT_COMMITTER_DATE: "2026-01-02T12:00:00Z",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    commit2 = git(repoRoot, ["rev-parse", "HEAD"]);

    lease = createDevSiteHttpApp({
      repoRoot,
      mainRef: "main",
      mounts: [{ kind: "router", createRouter: createCommitsRouter }],
    });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repoRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    devSiteDbManager.clearAllTablesForTests(lease.devSiteDbKey);
    await throwError(
      scanCommits(lease.devSiteDbKey, { repoRoot, mainRef: "main" }),
    );
  });

  it("GET /api/commits lists summaries newest-first", async () => {
    const response = await request(lease.app).get("/api/commits");
    expect(response.status).toBe(200);
    expect(response.body.commits.map((c: { hash: string }) => c.hash)).toEqual(
      [commit2, commit1],
    );
    expect(response.body.commits[0].summaryMetrics).toMatchObject({
      exportCount: 2,
      testCaseCount: 2,
    });
  });

  it("GET /api/commits/:hash returns commit detail", async () => {
    const response = await request(lease.app).get(`/api/commits/${commit2}`);
    expect(response.status).toBe(200);
    expect(response.body.commitDetail.commit.hash).toBe(commit2);
    expect(
      response.body.commitDetail.exports
        .map((e: { name: string }) => e.name)
        .sort(),
    ).toEqual(["ZERO", "add"].sort());
  });

  it("GET /api/commits/:hash returns 404 for unknown hash", async () => {
    const response = await request(lease.app).get(
      "/api/commits/cccccccccccccccccccccccccccccccccccccccc",
    );
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("COMMIT_NOT_FOUND");
  });

  it("GET /api/commits/:hash/packages/:packageName returns package detail", async () => {
    const encoded = encodeURIComponent("@fixture/root");
    const response = await request(lease.app).get(
      `/api/commits/${commit2}/packages/${encoded}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.packageDetail.packageName).toBe("@fixture/root");
    expect(
      response.body.packageDetail.exports
        .map((e: { name: string }) => e.name)
        .sort(),
    ).toEqual(["ZERO", "add"].sort());
    expect(
      response.body.packageDetail.testCases.map(
        (t: { fullName: string }) => t.fullName,
      ),
    ).toEqual(["math > adds", "math > zero"]);
  });

  it("GET /api/commits/:hash/diff/:otherHash diffs two commits", async () => {
    const response = await request(lease.app).get(
      `/api/commits/${commit1}/diff/${commit2}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.commitDiff.fromHash).toBe(commit1);
    expect(response.body.commitDiff.toHash).toBe(commit2);
    expect(
      response.body.commitDiff.exports.added.map((e: { name: string }) => e.name),
    ).toEqual(["ZERO"]);
    expect(
      response.body.commitDiff.testCases.added.map(
        (t: { fullName: string }) => t.fullName,
      ),
    ).toEqual(["math > zero"]);
  });
});
