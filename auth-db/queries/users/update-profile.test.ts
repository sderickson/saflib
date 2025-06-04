import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { updateProfile } from "./update-profile.js";
import type { DbKey } from "@saflib/drizzle-sqlite3";
// TODO: Uncomment and fix this import
// import { someDb } from "@own/package";

describe("updateProfile", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = someDb.connect();
  });

  afterEach(async () => {
    someDb.disconnect(dbKey);
  });

  it.skip("should execute successfully", async () => {
    const { result } = await updateProfile(dbKey, {});
    expect(result).toBeDefined();
  });
});
