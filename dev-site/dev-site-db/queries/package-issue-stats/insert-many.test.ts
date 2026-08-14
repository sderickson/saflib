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
  const commitHash = "ffffffffffffffffffffffffffffffffffffffff";

  beforeAll(() => {
    dbKey = devSiteDbManager.connect();
  });

  afterAll(() => {
    devSiteDbManager.disconnect(dbKey);
  });

  beforeEach(async () => {
    devSiteDbManager.clearAllTablesForTests(dbKey);
    await throwError(insert(dbKey, makeCommit({ hash: commitHash })));
  });

  it("insertMany + listByCommit round-trip", async () => {
    const inserted = await throwError(
      insertMany(dbKey, [
        {
          commitHash,
          packageName: "@pathclerk/daemon-http",
          kind: "dead-code",
          count: 3,
        },
        {
          commitHash,
          packageName: "@pathclerk/daemon-http",
          kind: "oversized-file",
          count: 1,
        },
        {
          commitHash,
          packageName: "@pathclerk/daemon-form-mappings",
          kind: "same-file-only-export",
          count: 5,
        },
      ]),
    );
    expect(inserted).toHaveLength(3);
    expect(inserted[0].id).toBeTruthy();

    const listed = await throwError(listByCommit(dbKey, commitHash));
    expect(listed).toHaveLength(3);
    expect(
      listed
        .map((r) => `${r.packageName}:${r.kind}:${r.count}`)
        .sort(),
    ).toEqual([
      "@pathclerk/daemon-form-mappings:same-file-only-export:5",
      "@pathclerk/daemon-http:dead-code:3",
      "@pathclerk/daemon-http:oversized-file:1",
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
    const otherHash = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    await throwError(insert(dbKey, makeCommit({ hash: otherHash })));
    await throwError(
      insertMany(dbKey, [
        {
          commitHash,
          packageName: "@a/pkg",
          kind: "dead-code",
          count: 2,
        },
        {
          commitHash: otherHash,
          packageName: "@a/pkg",
          kind: "dead-code",
          count: 9,
        },
      ]),
    );

    const deleted = await throwError(deleteByCommit(dbKey, commitHash));
    expect(deleted.deleted).toBe(1);
    expect(await throwError(listByCommit(dbKey, commitHash))).toEqual([]);
    expect(
      (await throwError(listByCommit(dbKey, otherHash))).map((r) => r.count),
    ).toEqual([9]);
  });
});
