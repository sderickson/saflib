import {
  beforeAll,
  afterAll,
  describe,
  it,
  expect,
} from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRepoRouter } from "./index.ts";
import { createDevSiteHttpApp } from "../../http.ts";
import { releaseSlimRouteTest } from "../../testing/slim-route-test.ts";
import type { DevSiteHttpAppLease } from "../../http.ts";

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

describe("repo routes", () => {
  let lease: DevSiteHttpAppLease;
  let repoRoot: string;
  let headHash: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "dev-site-repo-route-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);
    mkdirSync(join(repoRoot, "docs"));
    mkdirSync(join(repoRoot, "src"));
    writeFileSync(join(repoRoot, "docs/guide.md"), "# Guide\n");
    writeFileSync(join(repoRoot, "docs/notes.txt"), "notes\n");
    writeFileSync(join(repoRoot, "src/a.ts"), "export const a = 1;\n");
    writeFileSync(join(repoRoot, "README.md"), "hello\n");
    git(repoRoot, ["add", "."]);
    git(repoRoot, ["commit", "-m", "init"]);
    headHash = git(repoRoot, ["rev-parse", "HEAD"]);

    lease = createDevSiteHttpApp({
      repoRoot,
      mainRef: "main",
      mounts: [{ kind: "router", createRouter: createRepoRouter }],
    });
  });

  afterAll(() => {
    releaseSlimRouteTest(lease);
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("GET /api/repo/files lists blobs at ref", async () => {
    const response = await request(lease.app)
      .get("/api/repo/files")
      .query({ ref: headHash });
    expect(response.status).toBe(200);
    const paths = response.body.files.map((f: { path: string }) => f.path).sort();
    expect(paths).toEqual([
      "README.md",
      "docs/guide.md",
      "docs/notes.txt",
      "src/a.ts",
    ]);
    for (const f of response.body.files) {
      expect(f.blobHash).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("GET /api/repo/files filters by prefix and ext", async () => {
    const byPrefix = await request(lease.app)
      .get("/api/repo/files")
      .query({ ref: headHash, prefix: "docs" });
    expect(byPrefix.status).toBe(200);
    expect(
      byPrefix.body.files.map((f: { path: string }) => f.path).sort(),
    ).toEqual(["docs/guide.md", "docs/notes.txt"]);

    const byExt = await request(lease.app)
      .get("/api/repo/files")
      .query({ ref: headHash, ext: ".md" });
    expect(byExt.status).toBe(200);
    expect(
      byExt.body.files.map((f: { path: string }) => f.path).sort(),
    ).toEqual(["README.md", "docs/guide.md"]);

    const byBoth = await request(lease.app)
      .get("/api/repo/files")
      .query({ ref: headHash, prefix: "docs", ext: ".md,.txt" });
    expect(byBoth.status).toBe(200);
    expect(
      byBoth.body.files.map((f: { path: string }) => f.path).sort(),
    ).toEqual(["docs/guide.md", "docs/notes.txt"]);
  });

  it("GET /api/repo/file returns utf8 content", async () => {
    const response = await request(lease.app)
      .get("/api/repo/file")
      .query({ ref: headHash, path: "docs/guide.md" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      path: "docs/guide.md",
      content: "# Guide\n",
    });
  });

  it("GET /api/repo/file returns 404 when missing", async () => {
    const response = await request(lease.app)
      .get("/api/repo/file")
      .query({ ref: headHash, path: "missing.md" });
    expect(response.status).toBe(404);
  });
});
