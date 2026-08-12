import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { analyzedCommitsDb } from "../analyzed-commits/index.ts";
import { listByCommit } from "./list-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";

describe("test-cases/list-by-commit", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = devSiteDbManager.connect();
  });

  afterAll(() => {
    devSiteDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    devSiteDbManager.clearAllTablesForTests(dbKey);
  });

  it("returns empty when commit has no test cases", async () => {
    const commit = makeCommit({
      hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    await throwError(analyzedCommitsDb.insert(dbKey, commit));
    expect(await throwError(listByCommit(dbKey, commit.hash))).toEqual([]);
  });
});
