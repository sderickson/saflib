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
import { createCheckoutRouter } from "./index.ts";
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

describe("checkout routes", () => {
  let lease: DevSiteHttpAppLease;
  let repoRoot: string;
  let headHash: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "dev-site-checkout-route-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);
    writeFileSync(
      join(repoRoot, "package.json"),
      JSON.stringify({ name: "@fixture/root" }),
    );
    mkdirSync(join(repoRoot, "src"));
    writeFileSync(join(repoRoot, "src/a.ts"), "export const a = 1;\n");
    writeFileSync(
      join(repoRoot, "src/a.test.ts"),
      'import { describe, it } from "vitest";\ndescribe("a", () => {\n  it("works", () => {});\n});\n',
    );
    git(repoRoot, ["add", "."]);
    git(repoRoot, ["commit", "-m", "init"]);
    headHash = git(repoRoot, ["rev-parse", "HEAD"]);

    lease = createDevSiteHttpApp({
      repoRoot,
      mainRef: "main",
      mounts: [{ kind: "router", createRouter: createCheckoutRouter }],
    });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repoRoot, { recursive: true, force: true });
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
  });

  it("GET /api/checkout includes packages after scan", async () => {
    await throwError(
      scanCommits(lease.devSiteDbKey, {
        repoRoot,
        mainRef: "main",
        commitHash: headHash,
      }),
    );
    const response = await request(lease.app).get("/api/checkout");
    expect(response.status).toBe(200);
    expect(response.body.analyzed).toBe(true);
    expect(response.body.branch).toBe("main");
    expect(response.body.packages.length).toBeGreaterThan(0);
    expect(response.body.packages[0].packageName).toBe("@fixture/root");
    expect(response.body.packages[0]).toMatchObject({
      debtCount: expect.any(Number),
      issueCountsByKind: {
        "dead-code": expect.any(Number),
        "oversized-file": expect.any(Number),
        "package-layout": expect.any(Number),
      },
    });
  });
});
