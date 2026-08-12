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
import { throwError } from "@saflib/monorepo";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { scanCommitsInWorker } from "./scan-dispatch.ts";

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

describe("scanCommitsInWorker", () => {
  let repoRoot: string;
  let dbPath: string;
  let commitHash: string;

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), "dev-site-scan-worker-"));
    repoRoot = join(dir, "repo");
    dbPath = join(dir, "dev-site.sqlite");
    mkdirSync(repoRoot);
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);
    writeFileSync(
      join(repoRoot, "package.json"),
      JSON.stringify({ name: "@fixture/worker" }),
    );
    mkdirSync(join(repoRoot, "src"));
    writeFileSync(join(repoRoot, "src/a.ts"), "export const a = 1;\n");
    git(repoRoot, ["add", "."]);
    git(repoRoot, ["commit", "-m", "init"]);
    commitHash = git(repoRoot, ["rev-parse", "HEAD"]);

    // Migrate schema on the main thread first.
    const dbKey = devSiteDb.connect({
      onDisk: dbPath,
      overrideTestDefault: true,
      pragmas: { journal_mode: "WAL", busy_timeout: 5000 },
    });
    devSiteDb.disconnect(dbKey);
  });

  afterAll(() => {
    rmSync(join(repoRoot, ".."), { recursive: true, force: true });
  });

  it("analyzes one commit in a worker without blocking the caller thread's sync path", async () => {
    const result = await throwError(
      scanCommitsInWorker({
        dbPath,
        repoRoot,
        mainRef: "main",
        limit: 1,
      }),
    );
    expect(result.scanned).toEqual([commitHash]);
    expect(result.failed).toEqual([]);
  });
});
