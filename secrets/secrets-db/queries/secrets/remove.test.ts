import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "@saflib/secrets-db";
import { remove } from "./remove.ts";

describe("remove", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretsDb.connect();
  });

  afterEach(async () => {
    secretsDb.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    // @ts-expect-error - TODO: remove this line and provide valid input
    const { result } = await remove(dbKey, {});
    expect(result).toBeDefined();
    assert(result);
    expect(result.name).toBe("test");
  });
});
