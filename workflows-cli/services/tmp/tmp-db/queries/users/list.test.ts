import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { tmpDbManager } from "../../instances.ts";
import { listUsers } from "./list.ts";

describe("listUsers", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = tmpDbManager.connect();
  });

  afterEach(async () => {
    tmpDbManager.disconnect(dbKey);
  });

  // TODO: unskip this test
  it.skip("should execute successfully", async () => {
    const { result } = await listUsers(dbKey, {});
    expect(result).toBeDefined();
    assert(result);
    expect(result.name).toBe("test");
  });
});
