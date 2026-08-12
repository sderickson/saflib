import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import request from "supertest";
import { analyzedCommitsDb } from "@saflib/dev-site-db/queries/analyzed-commits/index";
import { packageMetricsDb } from "@saflib/dev-site-db/queries/package-metrics/index";
import { exportsDb } from "@saflib/dev-site-db/queries/exports/index";
import { testCasesDb } from "@saflib/dev-site-db/queries/test-cases/index";
import { throwError } from "@saflib/monorepo";
import { createCommitsRouter } from "./index.ts";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
  type SlimRouteTestContext,
} from "../../testing/slim-route-test.ts";

const HASH_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

async function seedTwoCommits(dbKey: SlimRouteTestContext["dbKey"]) {
  await throwError(
    analyzedCommitsDb.insert(dbKey, {
      hash: HASH_A,
      parentHashes: [],
      authoredAt: new Date("2026-01-01T00:00:00.000Z"),
      message: "first",
      refs: [],
      analyzerVersion: "1",
      computedAt: new Date("2026-01-01T01:00:00.000Z"),
      status: "complete",
    }),
  );
  await throwError(
    analyzedCommitsDb.insert(dbKey, {
      hash: HASH_B,
      parentHashes: [HASH_A],
      authoredAt: new Date("2026-01-02T00:00:00.000Z"),
      message: "second",
      refs: [{ name: "main", type: "branch", isMainAncestor: true }],
      analyzerVersion: "1",
      computedAt: new Date("2026-01-02T01:00:00.000Z"),
      status: "complete",
    }),
  );
  await throwError(
    packageMetricsDb.insertMany(dbKey, [
      {
        commitHash: HASH_A,
        packageName: "@fixture/root",
        directory: "",
        sourceFiles: 1,
        sourceLines: 10,
        prodLines: 10,
        testLines: 0,
        testFiles: 0,
      },
      {
        commitHash: HASH_B,
        packageName: "@fixture/root",
        directory: "",
        sourceFiles: 2,
        sourceLines: 20,
        prodLines: 15,
        testLines: 5,
        testFiles: 1,
      },
    ]),
  );
  await throwError(
    exportsDb.insertMany(dbKey, [
      {
        commitHash: HASH_A,
        packageName: "@fixture/root",
        filePath: "src/a.ts",
        name: "a",
        kind: "function",
      },
      {
        commitHash: HASH_B,
        packageName: "@fixture/root",
        filePath: "src/a.ts",
        name: "a",
        kind: "function",
      },
      {
        commitHash: HASH_B,
        packageName: "@fixture/root",
        filePath: "src/b.ts",
        name: "b",
        kind: "const",
      },
    ]),
  );
  await throwError(
    testCasesDb.insertMany(dbKey, [
      {
        commitHash: HASH_B,
        packageName: "@fixture/root",
        filePath: "src/a.test.ts",
        fullName: "a > works",
      },
    ]),
  );
}

describe("commits routes", () => {
  let ctx: SlimRouteTestContext;

  beforeAll(() => {
    ctx = acquireRouterSlimRouteTest(createCommitsRouter);
  });

  afterAll(() => {
    releaseSlimRouteTest(ctx.lease);
  });

  beforeEach(async () => {
    const { devSiteDbManager } = await import(
      "@saflib/dev-site-db/instances"
    );
    devSiteDbManager.clearAllTablesForTests(ctx.dbKey);
    await seedTwoCommits(ctx.dbKey);
  });

  it("GET /commits lists summaries newest-first", async () => {
    const response = await request(ctx.app).get("/commits");
    expect(response.status).toBe(200);
    expect(response.body.commits.map((c: { hash: string }) => c.hash)).toEqual(
      [HASH_B, HASH_A],
    );
    expect(response.body.commits[0].summaryMetrics).toMatchObject({
      exportCount: 2,
      testCaseCount: 1,
    });
  });

  it("GET /commits/:hash returns commit detail", async () => {
    const response = await request(ctx.app).get(`/commits/${HASH_B}`);
    expect(response.status).toBe(200);
    expect(response.body.commitDetail.commit.hash).toBe(HASH_B);
    expect(response.body.commitDetail.exports.map((e: { name: string }) => e.name)).toEqual(
      ["a", "b"],
    );
  });

  it("GET /commits/:hash returns 404 for unknown hash", async () => {
    const response = await request(ctx.app).get(
      "/commits/cccccccccccccccccccccccccccccccccccccccc",
    );
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("COMMIT_NOT_FOUND");
  });

  it("GET /commits/:hash/diff/:otherHash diffs two commits", async () => {
    const response = await request(ctx.app).get(
      `/commits/${HASH_A}/diff/${HASH_B}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.commitDiff.fromHash).toBe(HASH_A);
    expect(response.body.commitDiff.toHash).toBe(HASH_B);
    expect(
      response.body.commitDiff.exports.added.map((e: { name: string }) => e.name),
    ).toEqual(["b"]);
    expect(
      response.body.commitDiff.testCases.added.map(
        (t: { fullName: string }) => t.fullName,
      ),
    ).toEqual(["a > works"]);
  });
});
