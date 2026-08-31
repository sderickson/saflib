import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";

import { insertMany } from "./insert-many.ts";
import { listByCommit } from "./list-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";

import { insert } from "@saflib/dev-site-db/queries/analyzed-commits/insert";
describe("package-metrics", () => {
  let dbKey: DbKey;
  const commit_hash = "ffffffffffffffffffffffffffffffffffffffff";

  beforeAll(() => {
    dbKey = devSiteDbManager.connect();
  });

  afterAll(() => {
    devSiteDbManager.disconnect(dbKey);
  });

  beforeEach(async () => {
    devSiteDbManager.clearAllTablesForTests(dbKey);
    await throwError(
      insert(dbKey, makeCommit({ hash: commit_hash })),
    );
  });

  it("insertMany + listByCommit round-trip", async () => {
    const inserted = await throwError(
      insertMany(dbKey, [
        {
          commit_hash,
          package_name: "@saflib/git",
          directory: "saflib/git",
          source_files: 3,
          source_lines: 100,
          prod_lines: 80,
          test_lines: 20,
          test_files: 1,
        },
        {
          commit_hash,
          package_name: "@saflib/parser",
          directory: "saflib/parser",
          source_files: 2,
          source_lines: 50,
          prod_lines: 40,
          test_lines: 10,
          test_files: 1,
        },
      ]),
    );
    expect(inserted).toHaveLength(2);
    expect(inserted[0].id).toBeTruthy();

    const listed = await throwError(listByCommit(dbKey, commit_hash));
    expect(listed.map((r) => r.package_name).sort()).toEqual([
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
