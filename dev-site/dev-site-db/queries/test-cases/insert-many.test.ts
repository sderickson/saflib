import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { sql } from "drizzle-orm";
import { devSiteDbManager } from "../../instances.ts";
import { analyzedCommitsDb } from "../analyzed-commits/index.ts";
import { insertMany } from "./insert-many.ts";
import { listByCommit, countByCommit } from "./list-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";
import { testCaseDefsTable } from "../../schemas/test-cases.ts";
import { commitTestCasesTable } from "../../schemas/commit-test-cases.ts";

describe("test-cases", () => {
  let dbKey: DbKey;
  const commitHash = "ffffffffffffffffffffffffffffffffffffffff";
  const commitHash2 = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

  beforeAll(() => {
    dbKey = devSiteDbManager.connect();
  });

  afterAll(() => {
    devSiteDbManager.disconnect(dbKey);
  });

  beforeEach(async () => {
    devSiteDbManager.clearAllTablesForTests(dbKey);
    await throwError(
      analyzedCommitsDb.insert(dbKey, makeCommit({ hash: commitHash })),
    );
  });

  it("insertMany + listByCommit round-trip", async () => {
    const inserted = await throwError(
      insertMany(dbKey, [
        {
          commitHash,
          packageName: "@saflib/git",
          filePath: "saflib/git/index.test.ts",
          fullName: "log > returns commits newest-first (git log order)",
        },
      ]),
    );
    expect(inserted).toHaveLength(1);
    expect(inserted[0].fullName).toContain(" > ");
    expect(inserted[0].hash).toMatch(/^[a-f0-9]{64}$/);

    const listed = await throwError(listByCommit(dbKey, commitHash));
    expect(listed).toHaveLength(1);
    expect(listed[0].fullName).toBe(inserted[0].fullName);
  });

  it("dedupes defs across commits that share a test identity", async () => {
    await throwError(
      analyzedCommitsDb.insert(dbKey, makeCommit({ hash: commitHash2 })),
    );
    const row = {
      packageName: "@saflib/git",
      filePath: "saflib/git/index.test.ts",
      fullName: "log > returns commits newest-first",
    };
    await throwError(insertMany(dbKey, [{ ...row, commitHash }]));
    await throwError(insertMany(dbKey, [{ ...row, commitHash: commitHash2 }]));

    const db = devSiteDbManager.get(dbKey)!;
    const defCount = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(testCaseDefsTable);
    expect(defCount[0].n).toBe(1);

    const linkCount = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(commitTestCasesTable);
    expect(linkCount[0].n).toBe(2);
    expect(await throwError(countByCommit(dbKey, commitHash))).toBe(1);
  });

  it("insertMany with empty array returns []", async () => {
    expect(await throwError(insertMany(dbKey, []))).toEqual([]);
  });
});
