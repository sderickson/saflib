import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";

import { insertMany } from "./insert-many.ts";
import { listByCommit } from "./list-by-commit.ts";
import { deleteByCommit } from "./delete-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";

import { insert } from "@saflib/dev-site-db/queries/analyzed-commits/insert";

describe("package-issue-stats", () => {
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
    await throwError(insert(dbKey, makeCommit({ hash: commit_hash })));
  });

  it("insertMany + listByCommit round-trip", async () => {
    const inserted = await throwError(
      insertMany(dbKey, [
        {
          commit_hash,
          package_name: "@acme/product-http",
          kind: "dead-code",
          count: 3,
        },
        {
          commit_hash,
          package_name: "@acme/product-http",
          kind: "oversized-file",
          count: 1,
        },
        {
          commit_hash,
          package_name: "@acme/product-form-mappings",
          kind: "package-layout",
          count: 5,
        },
      ]),
    );
    expect(inserted).toHaveLength(3);
    expect(inserted[0].id).toBeTruthy();

    const listed = await throwError(listByCommit(dbKey, commit_hash));
    expect(listed).toHaveLength(3);
    expect(
      listed
        .map((r) => `${r.package_name}:${r.kind}:${r.count}`)
        .sort(),
    ).toEqual([
      "@acme/product-form-mappings:package-layout:5",
      "@acme/product-http:dead-code:3",
      "@acme/product-http:oversized-file:1",
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

  it("deleteByCommit removes rows for that commit only", async () => {
    const other_hash = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    await throwError(insert(dbKey, makeCommit({ hash: other_hash })));
    await throwError(
      insertMany(dbKey, [
        {
          commit_hash,
          package_name: "@a/pkg",
          kind: "dead-code",
          count: 2,
        },
        {
          commit_hash: other_hash,
          package_name: "@a/pkg",
          kind: "dead-code",
          count: 9,
        },
      ]),
    );

    const deleted = await throwError(deleteByCommit(dbKey, commit_hash));
    expect(deleted.deleted).toBe(1);
    expect(await throwError(listByCommit(dbKey, commit_hash))).toEqual([]);
    expect(
      (await throwError(listByCommit(dbKey, other_hash))).map((r) => r.count),
    ).toEqual([9]);
  });
});
