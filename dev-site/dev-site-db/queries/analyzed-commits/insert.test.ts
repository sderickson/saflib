import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { insert } from "./insert.ts";
import { makeCommit } from "../test-helpers.ts";

describe("analyzed-commits/insert", () => {
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

  it("inserts and returns the analyzed commit", async () => {
    const params = makeCommit({
      hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      message: "hello",
    });
    const result = await throwError(insert(dbKey, params));
    expect(result).toEqual(params);
  });
});
