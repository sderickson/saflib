import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDb, devSiteDbManager } from "@saflib/dev-site-db/instances";
import { scanCommits } from "./scan.ts";
import { getCommit, listCommitSummaries } from "./get-commit.ts";
import { diffCommits } from "./diff-commits.ts";
import { ANALYZER_VERSION } from "./analyze-commit.ts";

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

describe("orchestration", () => {
  let repoRoot: string;
  let dbKey: DbKey;
  let commit1: string;
  let commit2: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "dev-site-http-"));
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
    execFileSync(
      "git",
      ["commit", "-m", "first: add math"],
      {
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
      },
    );
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
    execFileSync(
      "git",
      ["commit", "-m", "second: add ZERO + test"],
      {
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
      },
    );
    commit2 = git(repoRoot, ["rev-parse", "HEAD"]);

    dbKey = devSiteDb.connect();
  });

  afterAll(() => {
    devSiteDb.disconnect(dbKey);
    rmSync(repoRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    devSiteDbManager.clearAllTablesForTests(dbKey);
  });

  it("scanCommits ingests mainline commits then skips on re-scan", async () => {
    const first = await throwError(
      scanCommits(dbKey, { repoRoot, mainRef: "main" }),
    );
    expect(first.scanned).toEqual([commit2, commit1]);
    expect(first.skipped).toEqual([]);
    expect(first.failed).toEqual([]);

    const second = await throwError(
      scanCommits(dbKey, { repoRoot, mainRef: "main" }),
    );
    expect(second.scanned).toEqual([]);
    expect(second.skipped).toEqual([commit2, commit1]);
    expect(second.failed).toEqual([]);
  });

  it("scanCommits with limit analyzes newest main commits first", async () => {
    const first = await throwError(
      scanCommits(dbKey, { repoRoot, mainRef: "main", limit: 1 }),
    );
    expect(first.scanned).toEqual([commit2]);
    expect(first.skipped).toEqual([]);

    const second = await throwError(
      scanCommits(dbKey, { repoRoot, mainRef: "main", limit: 1 }),
    );
    expect(second.scanned).toEqual([commit1]);
    expect(second.skipped).toEqual([commit2]);
  });

  it("getCommit returns metrics, exports, and test cases", async () => {
    await throwError(scanCommits(dbKey, { repoRoot, mainRef: "main" }));

    const detail = await throwError(getCommit(dbKey, commit2));
    expect(detail.commit.hash).toBe(commit2);
    expect(detail.commit.analyzerVersion).toBe(ANALYZER_VERSION);
    expect(detail.commit.status).toBe("complete");
    expect(detail.packageMetrics.length).toBeGreaterThan(0);
    expect(detail.exports.map((e) => e.name).sort()).toEqual(["ZERO", "add"]);
    expect(detail.testCases.map((t) => t.fullName).sort()).toEqual([
      "math > adds",
      "math > zero",
    ]);
  });

  it("listCommitSummaries pages newest-first with rollups", async () => {
    await throwError(scanCommits(dbKey, { repoRoot, mainRef: "main" }));

    const page = await throwError(listCommitSummaries(dbKey, { limit: 1 }));
    expect(page.commits).toHaveLength(1);
    expect(page.commits[0].hash).toBe(commit2);
    expect(page.commits[0].summaryMetrics.exportCount).toBe(2);
    expect(page.commits[0].summaryMetrics.testCaseCount).toBe(2);
    expect(page.nextCursor).toBe(commit2);

    const page2 = await throwError(
      listCommitSummaries(dbKey, { cursor: commit2, limit: 10 }),
    );
    expect(page2.commits.map((c) => c.hash)).toEqual([commit1]);
    expect(page2.nextCursor).toBeNull();
  });

  it("diffCommits reports added exports and test cases", async () => {
    await throwError(scanCommits(dbKey, { repoRoot, mainRef: "main" }));

    const diff = await throwError(diffCommits(dbKey, commit1, commit2));
    expect(diff.fromHash).toBe(commit1);
    expect(diff.toHash).toBe(commit2);
    expect(diff.exports.added.map((e) => e.name)).toEqual(["ZERO"]);
    expect(diff.exports.removed).toEqual([]);
    expect(diff.testCases.added.map((t) => t.fullName)).toEqual([
      "math > zero",
    ]);
  });
});
