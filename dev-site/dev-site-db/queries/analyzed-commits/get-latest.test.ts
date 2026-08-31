import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { insert } from "./insert.ts";
import { getLatest } from "./get-latest.ts";
import { makeCommit } from "../test-helpers.ts";

describe("analyzed-commits/get-latest", () => {
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

  it("returns null when empty", async () => {
    const result = await throwError(getLatest(dbKey));
    expect(result).toBeNull();
  });

  it("returns the most recently authored commit", async () => {
    await throwError(
      insert(
        dbKey,
        makeCommit({
          hash: "1111111111111111111111111111111111111111",
          authored_at: new Date("2026-01-01T00:00:00Z"),
        }),
      ),
    );
    const latest = makeCommit({
      hash: "2222222222222222222222222222222222222222",
      authored_at: new Date("2026-06-01T00:00:00Z"),
    });
    await throwError(insert(dbKey, latest));
    const result = await throwError(getLatest(dbKey));
    expect(result?.hash).toBe(latest.hash);
  });
});
