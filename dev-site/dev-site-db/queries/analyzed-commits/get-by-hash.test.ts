import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "../../errors.ts";
import { devSiteDbManager } from "../../instances.ts";
import { insert } from "./insert.ts";
import { getByHash } from "./get-by-hash.ts";
import { makeCommit } from "../test-helpers.ts";

describe("analyzed-commits/get-by-hash", () => {
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

  it("returns the commit when present", async () => {
    const params = makeCommit({
      hash: "cccccccccccccccccccccccccccccccccccccccc",
    });
    await throwError(insert(dbKey, params));
    const result = await throwError(getByHash(dbKey, params.hash));
    expect(result).toEqual(params);
  });

  it("returns AnalyzedCommitNotFoundError when missing", async () => {
    const { error } = await getByHash(
      dbKey,
      "dddddddddddddddddddddddddddddddddddddddd",
    );
    expect(error).toBeInstanceOf(AnalyzedCommitNotFoundError);
  });
});
