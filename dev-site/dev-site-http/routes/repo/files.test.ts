import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
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

describe("repo files routes", () => {
  let lease: DevSiteHttpAppLease;
  let repoRoot: string;
  let headHash: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "dev-site-repo-files-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);
    mkdirSync(join(repoRoot, "pages"), { recursive: true });
    writeFileSync(
      join(repoRoot, "pages/Home.vue"),
      "<script setup>\nconst x = 1;\n</script>\n",
    );
    writeFileSync(
      join(repoRoot, "pages/Home.loader.ts"),
      "export async function load() {}\n",
    );
    writeFileSync(
      join(repoRoot, "pages/Home.test.ts"),
      'describe("Home", () => {});\n',
    );
    writeFileSync(
      join(repoRoot, "pages/HomeAsync.vue"),
      "<template>async</template>\n",
    );
    writeFileSync(join(repoRoot, "pages/README.md"), "# Pages\n\nHome views.\n");
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

  it("lists every file sharing a stem prefix in one response", async () => {
    const response = await request(lease.app).get("/api/repo/files").query({
      ref: headHash,
      prefix: "pages/Home",
      content: true,
    });
    expect(response.status).toBe(200);
    const paths = response.body.files.map((f: { path: string }) => f.path);
    expect(paths).toEqual([
      "pages/Home.loader.ts",
      "pages/Home.test.ts",
      "pages/Home.vue",
    ]);
    expect(paths).not.toContain("pages/HomeAsync.vue");
    const vue = response.body.files.find(
      (f: { path: string }) => f.path === "pages/Home.vue",
    );
    expect(vue.content).toContain("const x = 1");
  });

  it("includes uncommitted HEAD working-tree files for the stem", async () => {
    writeFileSync(
      join(repoRoot, "pages/Home.logic.ts"),
      "export function useHome() {}\n",
    );
    const response = await request(lease.app).get("/api/repo/files").query({
      ref: headHash,
      prefix: "pages/Home",
      content: true,
    });
    expect(response.status).toBe(200);
    const paths = response.body.files.map((f: { path: string }) => f.path);
    expect(paths).toContain("pages/Home.logic.ts");
    const logic = response.body.files.find(
      (f: { path: string }) => f.path === "pages/Home.logic.ts",
    );
    expect(logic.blobHash).toBe("");
    expect(logic.content).toContain("useHome");
  });

  it("rejects content without a prefix", async () => {
    const response = await request(lease.app).get("/api/repo/files").query({
      ref: headHash,
      content: true,
    });
    expect(response.status).toBe(400);
  });
});
