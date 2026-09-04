import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { throwError } from "@saflib/utils";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { scanCommitsInWorker } from "./scan-dispatch.ts";

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

describe("scanCommitsInWorker", () => {
  let repo_root: string;
  let dbPath: string;
  let commit_hash: string;

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), "dev-site-scan-worker-"));
    repo_root = join(dir, "repo");
    dbPath = join(dir, "dev-site.sqlite");
    mkdirSync(repo_root);
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);
    writeFileSync(
      join(repo_root, "package.json"),
      JSON.stringify({ name: "@fixture/worker" }),
    );
    mkdirSync(join(repo_root, "src"));
    writeFileSync(join(repo_root, "src/a.ts"), "export const a = 1;\n");
    git(repo_root, ["add", "."]);
    git(repo_root, ["commit", "-m", "init"]);
    commit_hash = git(repo_root, ["rev-parse", "HEAD"]);

    // Migrate schema on the main thread first.
    const dbKey = devSiteDb.connect({
      onDisk: dbPath,
      overrideTestDefault: true,
      pragmas: { journal_mode: "WAL", busy_timeout: 5000 },
    });
    devSiteDb.disconnect(dbKey);
  });

  afterAll(() => {
    rmSync(join(repo_root, ".."), { recursive: true, force: true });
  });

  it("analyzes one commit in a worker without blocking the caller thread's sync path", async () => {
    const result = await throwError(
      scanCommitsInWorker({
        dbPath,
        repo_root,
        mainRef: "main",
        limit: 1,
      }),
    );
    expect(result.scanned).toEqual([commit_hash]);
    expect(result.failed).toEqual([]);
  });
});
