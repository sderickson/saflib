import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { analyzedCommitsDb } from "../analyzed-commits/index.ts";
import { insertMany } from "./insert-many.ts";
import { listByCommit } from "./list-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";

describe("test-cases", () => {
  let dbKey: DbKey;
  const commitHash = "ffffffffffffffffffffffffffffffffffffffff";

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

    const listed = await throwError(listByCommit(dbKey, commitHash));
    expect(listed).toHaveLength(1);
    expect(listed[0].fullName).toBe(inserted[0].fullName);
  });

  it("insertMany with empty array returns []", async () => {
    expect(await throwError(insertMany(dbKey, []))).toEqual([]);
  });
});
