// @ts-nocheck - TODO remove this line as part of workflow
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
// TODO: Uncomment and fix this import
// import { someDb, someQueryDb } from "@own/package";

describe("getById", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = someDb.connect();
  });

  afterEach(async () => {
    someDb.disconnect(dbKey);
  });

  it.skip("should execute successfully", async () => {
    const { result } = await someQueryDb.getById(dbKey, {});
    expect(result).toBeDefined();
  });
});
