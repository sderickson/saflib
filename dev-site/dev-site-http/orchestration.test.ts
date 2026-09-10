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
import { throwError } from "@saflib/utils";
import { devSiteDb, devSiteDbManager } from "@saflib/dev-site-db/instances";
import { scanCommits } from "./scan.ts";
import { getCommit, listCommitSummaries } from "./get-commit.ts";
import { diffCommits } from "./diff-commits.ts";
import { ANALYZER_VERSION } from "./analyze-commit.ts";

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

describe("orchestration", () => {
  let repo_root: string;
  let dbKey: DbKey;
  let commit1: string;
  let commit2: string;

  beforeAll(() => {
    repo_root = mkdtempSync(join(tmpdir(), "dev-site-http-"));
    git(repo_root, ["init"]);
    git(repo_root, ["checkout", "-b", "main"]);

    writeFileSync(
      join(repo_root, "package.json"),
      JSON.stringify({ name: "@fixture/root" }),
    );
    mkdirSync(join(repo_root, "src"));
    writeFileSync(
      join(repo_root, "src/math.ts"),
      "export function add(a: number, b: number) { return a + b; }\n",
    );
    writeFileSync(
      join(repo_root, "src/math.test.ts"),
      'import { describe, it } from "vitest";\ndescribe("math", () => {\n  it("adds", () => {});\n});\n',
    );
    git(repo_root, ["add", "."]);
    execFileSync(
      "git",
      ["commit", "-m", "first: add math"],
      {
        cwd: repo_root,
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
    commit1 = git(repo_root, ["rev-parse", "HEAD"]);

    writeFileSync(
      join(repo_root, "src/math.ts"),
      "export function add(a: number, b: number) { return a + b; }\nexport const ZERO = 0;\n",
    );
    writeFileSync(
      join(repo_root, "src/math.test.ts"),
      'import { describe, it } from "vitest";\ndescribe("math", () => {\n  it("adds", () => {});\n  it("zero", () => {});\n});\n',
    );
    git(repo_root, ["add", "."]);
    execFileSync(
      "git",
      ["commit", "-m", "second: add ZERO + test"],
      {
        cwd: repo_root,
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
    commit2 = git(repo_root, ["rev-parse", "HEAD"]);

    dbKey = devSiteDb.connect();
  });

  afterAll(() => {
    devSiteDb.disconnect(dbKey);
    rmSync(repo_root, { recursive: true, force: true });
  });

  beforeEach(() => {
    devSiteDbManager.clearAllTablesForTests(dbKey);
  });

  it("scanCommits ingests mainline commits then skips on re-scan", async () => {
    const first = await throwError(
      scanCommits(dbKey, { repo_root, mainRef: "main" }),
    );
    expect(first.scanned).toEqual([commit2, commit1]);
    expect(first.skipped).toEqual([]);
    expect(first.failed).toEqual([]);

    const second = await throwError(
      scanCommits(dbKey, { repo_root, mainRef: "main" }),
    );
    expect(second.scanned).toEqual([]);
    expect(second.skipped).toEqual([commit2, commit1]);
    expect(second.failed).toEqual([]);
  });

  it("scanCommits with limit analyzes newest main commits first", async () => {
    const first = await throwError(
      scanCommits(dbKey, { repo_root, mainRef: "main", limit: 1 }),
    );
    expect(first.scanned).toEqual([commit2]);
    expect(first.skipped).toEqual([]);

    const second = await throwError(
      scanCommits(dbKey, { repo_root, mainRef: "main", limit: 1 }),
    );
    expect(second.scanned).toEqual([commit1]);
    expect(second.skipped).toEqual([commit2]);
  });

  it("getCommit returns metrics, exports, and test cases", async () => {
    await throwError(scanCommits(dbKey, { repo_root, mainRef: "main" }));

    const detail = await throwError(
      getCommit(dbKey, commit2, { repo_root, mainRef: "main" }),
    );
    expect(detail.commit.hash).toBe(commit2);
    expect(detail.commit.analyzer_version).toBe(ANALYZER_VERSION);
    expect(detail.commit.status).toBe("complete");
    expect(detail.package_metrics.length).toBeGreaterThan(0);
    expect(detail.exports.map((e) => e.name).sort()).toEqual(["ZERO", "add"]);
    expect(detail.test_cases.map((t) => t.full_name).sort()).toEqual([
      "math > adds",
      "math > zero",
    ]);
  });

  it("listCommitSummaries pages newest-first with rollups", async () => {
    await throwError(scanCommits(dbKey, { repo_root, mainRef: "main" }));

    const page = await throwError(listCommitSummaries(dbKey, { limit: 1 }));
    expect(page.commits).toHaveLength(1);
    expect(page.commits[0].hash).toBe(commit2);
    expect(page.commits[0].summary_metrics.export_count).toBe(2);
    expect(page.commits[0].summary_metrics.test_case_count).toBe(2);
    expect(page.next_cursor).toBe(commit2);

    const page2 = await throwError(
      listCommitSummaries(dbKey, { cursor: commit2, limit: 10 }),
    );
    expect(page2.commits.map((c) => c.hash)).toEqual([commit1]);
    expect(page2.next_cursor).toBeNull();
  });

  it("diffCommits reports added exports and test cases", async () => {
    await throwError(scanCommits(dbKey, { repo_root, mainRef: "main" }));

    const diff = await throwError(
      diffCommits(dbKey, commit1, commit2, { repo_root, mainRef: "main" }),
    );
    expect(diff.from_hash).toBe(commit1);
    expect(diff.to_hash).toBe(commit2);
    expect(diff.exports.added.map((e) => e.name)).toEqual(["ZERO"]);
    expect(diff.exports.removed).toEqual([]);
    expect(diff.test_cases.added.map((t) => t.full_name)).toEqual([
      "math > zero",
    ]);
  });
});
