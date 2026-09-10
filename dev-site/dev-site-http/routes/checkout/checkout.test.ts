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
import { throwError } from "@saflib/utils";
import { createCheckoutRouter } from "./index.ts";
import { createDevSiteHttpApp } from "../../http.ts";
import { releaseSlimRouteTest } from "../../testing/slim-route-test.ts";
import type { DevSiteHttpAppLease } from "../../http.ts";
import { devSiteDbManager } from "@saflib/dev-site-db/instances";
import { scanCommits } from "../../scan.ts";

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

describe("checkout routes", () => {
  let lease: DevSiteHttpAppLease;
  let repo_root: string;
  let headHash: string;

  beforeAll(() => {
    repo_root = mkdtempSync(join(tmpdir(), "dev-site-checkout-route-"));
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);
    writeFileSync(
      join(repo_root, "package.json"),
      JSON.stringify({ name: "@fixture/root" }),
    );
    mkdirSync(join(repo_root, "src"));
    writeFileSync(join(repo_root, "src/a.ts"), "export const a = 1;\n");
    writeFileSync(
      join(repo_root, "src/a.test.ts"),
      'import { describe, it } from "vitest";\ndescribe("a", () => {\n  it("works", () => {});\n});\n',
    );
    git(repo_root, ["add", "."]);
    git(repo_root, ["commit", "-m", "init"]);
    headHash = git(repo_root, ["rev-parse", "HEAD"]);

    lease = createDevSiteHttpApp({
      repo_root,
      mainRef: "main",
      mounts: [{ kind: "router", createRouter: createCheckoutRouter }],
    });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repo_root, { recursive: true, force: true });
  });

  beforeEach(() => {
    devSiteDbManager.clearAllTablesForTests(lease.devSiteDbKey);
  });

  it("GET /api/checkout reports HEAD not analyzed", async () => {
    const response = await request(lease.app).get("/api/checkout");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      hash: headHash,
      analyzed: false,
      packages: [],
      branch: "main",
    });
    expect(response.body.message).toContain("init");
    expect(response.body.compare_candidates).toEqual(["main"]);
    expect(response.body.compare).toMatchObject({
      against_ref: "main",
      merge_base_hash: headHash,
      merge_base_analyzed: false,
    });
    expect(response.body.compare.renames).toEqual([]);
  });

  it("GET /api/checkout includes packages after scan", async () => {
    await throwError(
      scanCommits(lease.devSiteDbKey, {
        repo_root,
        mainRef: "main",
        commit_hash: headHash,
      }),
    );
    const response = await request(lease.app).get("/api/checkout");
    expect(response.status).toBe(200);
    expect(response.body.analyzed).toBe(true);
    expect(response.body.branch).toBe("main");
    expect(response.body.packages.length).toBeGreaterThan(0);
    expect(response.body.packages[0].package_name).toBe("@fixture/root");
    expect(response.body.packages[0]).toMatchObject({
      kind: "other",
      debt_count: expect.any(Number),
      issue_counts_by_kind: {
        "dead-code": expect.any(Number),
        "oversized-file": expect.any(Number),
        "package-layout": expect.any(Number),
      },
    });
    expect(response.body.compare).toMatchObject({
      against_ref: "main",
      merge_base_hash: headHash,
      merge_base_analyzed: true,
    });
    expect(response.body.compare.renames).toEqual([]);
  });

  it("GET /api/checkout reports merge-base for a feature branch", async () => {
    git(repo_root, ["checkout", "-b", "feature"]);
    writeFileSync(join(repo_root, "src/b.ts"), "export const b = 2;\n");
    git(repo_root, ["add", "src/b.ts"]);
    git(repo_root, ["commit", "-m", "feature"]);
    const featureHead = git(repo_root, ["rev-parse", "HEAD"]);

    const response = await request(lease.app).get(
      "/api/checkout?compare_ref=main",
    );
    expect(response.status).toBe(200);
    expect(response.body.hash).toBe(featureHead);
    expect(response.body.branch).toBe("feature");
    expect(response.body.compare_candidates).toEqual(["main"]);
    expect(response.body.compare).toMatchObject({
      against_ref: "main",
      merge_base_hash: headHash,
      merge_base_analyzed: false,
    });
    expect(response.body.compare.renames).toEqual([]);

    git(repo_root, ["checkout", "main"]);
  });

  it("GET /api/checkout includes git find-renames pairs vs the fork point", async () => {
    git(repo_root, ["checkout", "-b", "renames"]);
    git(repo_root, ["mv", "src/a.ts", "src/moved.ts"]);
    git(repo_root, ["commit", "-m", "move a"]);

    const response = await request(lease.app).get(
      "/api/checkout?compare_ref=main",
    );
    expect(response.status).toBe(200);
    expect(response.body.compare.renames).toEqual([
      { from_path: "src/a.ts", to_path: "src/moved.ts", score: 100 },
    ]);

    git(repo_root, ["checkout", "main"]);
  });

  it("GET /api/checkout returns 400 for an unknown compare_ref", async () => {
    const response = await request(lease.app).get(
      "/api/checkout?compare_ref=no-such-branch",
    );
    expect(response.status).toBe(400);
  });
});
