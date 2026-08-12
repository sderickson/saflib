import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { analyzedCommitsDb } from "../analyzed-commits/index.ts";
import { insertMany } from "./insert-many.ts";
import { listByCommit } from "./list-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";

describe("package-metrics", () => {
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
          directory: "saflib/git",
          sourceFiles: 3,
          sourceLines: 100,
          prodLines: 80,
          testLines: 20,
          testFiles: 1,
        },
        {
          commitHash,
          packageName: "@saflib/parser",
          directory: "saflib/parser",
          sourceFiles: 2,
          sourceLines: 50,
          prodLines: 40,
          testLines: 10,
          testFiles: 1,
        },
      ]),
    );
    expect(inserted).toHaveLength(2);
    expect(inserted[0].id).toBeTruthy();

    const listed = await throwError(listByCommit(dbKey, commitHash));
    expect(listed.map((r) => r.packageName).sort()).toEqual([
      "@saflib/git",
      "@saflib/parser",
    ]);
  });

  it("insertMany with empty array returns []", async () => {
    const result = await throwError(insertMany(dbKey, []));
    expect(result).toEqual([]);
  });

  it("listByCommit returns [] for unknown hash", async () => {
    const result = await throwError(
      listByCommit(dbKey, "0000000000000000000000000000000000000000"),
    );
    expect(result).toEqual([]);
  });
});
