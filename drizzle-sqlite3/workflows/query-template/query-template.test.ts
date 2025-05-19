import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { queryTemplate } from "./query-template.js";
import type { DbKey } from "@saflib/drizzle-sqlite3";
// TODO: Uncomment and fix this import
// import { someDb } from "@own/package";

describe("queryTemplate", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    // dbKey = mainDbManager.connect();
  });

  afterEach(async () => {
    // mainDbManager.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    const result = await queryTemplate(dbKey);
    expect(result.isOk()).toBe(true);
  });
});
