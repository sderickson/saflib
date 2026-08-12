import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { eq, sql } from "drizzle-orm";
import { devSiteDbManager } from "../../instances.ts";
import { analyzedCommitsDb } from "../analyzed-commits/index.ts";
import { insertMany } from "./insert-many.ts";
import { listByCommit, countByCommit, listHashesByCommit } from "./list-by-commit.ts";
import { makeCommit } from "../test-helpers.ts";
import { exportDefsTable } from "../../schemas/exports.ts";
import { commitExportsTable } from "../../schemas/commit-exports.ts";

describe("exports", () => {
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
          filePath: "saflib/git/log.ts",
          name: "log",
          kind: "function",
        },
      ]),
    );
    expect(inserted).toHaveLength(1);
    expect(inserted[0].name).toBe("log");
    expect(inserted[0].hash).toMatch(/^[a-f0-9]{64}$/);

    const listed = await throwError(listByCommit(dbKey, commitHash));
    expect(listed).toHaveLength(1);
    expect(listed[0].kind).toBe("function");
    expect(listed[0].hash).toBe(inserted[0].hash);
  });

  it("dedupes defs across commits that share an export identity", async () => {
    await throwError(
      analyzedCommitsDb.insert(dbKey, makeCommit({ hash: commitHash2 })),
    );
    const row = {
      packageName: "@saflib/git",
      filePath: "saflib/git/log.ts",
      name: "log",
      kind: "function" as const,
    };
    await throwError(insertMany(dbKey, [{ ...row, commitHash }]));
    await throwError(insertMany(dbKey, [{ ...row, commitHash: commitHash2 }]));

    const db = devSiteDbManager.get(dbKey)!;
    const defCount = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(exportDefsTable);
    expect(defCount[0].n).toBe(1);

    const linkCount = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(commitExportsTable);
    expect(linkCount[0].n).toBe(2);

    const hashes1 = await throwError(listHashesByCommit(dbKey, commitHash));
    const hashes2 = await throwError(listHashesByCommit(dbKey, commitHash2));
    expect(hashes1).toEqual(hashes2);
    expect(await throwError(countByCommit(dbKey, commitHash))).toBe(1);
  });

  it("insertMany with empty array returns []", async () => {
    expect(await throwError(insertMany(dbKey, []))).toEqual([]);
  });

  it("batches inserts above sqlite variable limits", async () => {
    // 5 cols/def → safe batch ~180; insert well above that.
    const rows = Array.from({ length: 400 }, (_, i) => ({
      commitHash,
      packageName: "@saflib/git",
      filePath: `saflib/git/f${i}.ts`,
      name: `fn${i}`,
      kind: "function" as const,
    }));
    const inserted = await throwError(insertMany(dbKey, rows));
    expect(inserted).toHaveLength(400);
    expect(await throwError(countByCommit(dbKey, commitHash))).toBe(400);
  });

  it("is idempotent when re-linking the same commit", async () => {
    const row = {
      commitHash,
      packageName: "@saflib/git",
      filePath: "saflib/git/log.ts",
      name: "log",
      kind: "function" as const,
    };
    await throwError(insertMany(dbKey, [row]));
    await throwError(insertMany(dbKey, [row]));
    expect(await throwError(countByCommit(dbKey, commitHash))).toBe(1);

    const db = devSiteDbManager.get(dbKey)!;
    const links = await db
      .select()
      .from(commitExportsTable)
      .where(eq(commitExportsTable.commitHash, commitHash));
    expect(links).toHaveLength(1);
  });
});
