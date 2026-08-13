import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";

import { listByCommit } from "./list-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";

import { insert } from "@saflib/dev-site-db/queries/analyzed-commits/insert";
describe("package-metrics/list-by-commit", () => {
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

  it("returns empty when commit has no metrics", async () => {
    const commit = makeCommit({
      hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    await throwError(insert(dbKey, commit));
    const result = await throwError(listByCommit(dbKey, commit.hash));
    expect(result).toEqual([]);
  });
});
