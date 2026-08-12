import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "../../errors.ts";
import { devSiteDbManager } from "../../instances.ts";
import { insert } from "./insert.ts";
import { list } from "./list.ts";
import { makeCommit } from "../test-helpers.ts";

describe("analyzed-commits/list", () => {
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

  it("returns commits newest-first and paginates with cursor", async () => {
    const older = makeCommit({
      hash: "1111111111111111111111111111111111111111",
      authoredAt: new Date("2026-01-01T00:00:00Z"),
    });
    const middle = makeCommit({
      hash: "2222222222222222222222222222222222222222",
      authoredAt: new Date("2026-01-02T00:00:00Z"),
    });
    const newer = makeCommit({
      hash: "3333333333333333333333333333333333333333",
      authoredAt: new Date("2026-01-03T00:00:00Z"),
    });
    await throwError(insert(dbKey, older));
    await throwError(insert(dbKey, middle));
    await throwError(insert(dbKey, newer));

    const page1 = await throwError(list(dbKey, { limit: 2 }));
    expect(page1.commits.map((c) => c.hash)).toEqual([newer.hash, middle.hash]);
    expect(page1.nextCursor).toBe(middle.hash);

    const page2 = await throwError(
      list(dbKey, { limit: 2, cursor: page1.nextCursor! }),
    );
    expect(page2.commits.map((c) => c.hash)).toEqual([older.hash]);
    expect(page2.nextCursor).toBeNull();
  });

  it("returns AnalyzedCommitNotFoundError for a bad cursor", async () => {
    const { error } = await list(dbKey, {
      cursor: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    });
    expect(error).toBeInstanceOf(AnalyzedCommitNotFoundError);
  });
});
