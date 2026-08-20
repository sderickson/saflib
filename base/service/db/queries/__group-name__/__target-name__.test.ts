// @ts-nocheck — scaffold placeholders until drizzle/add-query copies this file.
import { describe, it, expect, beforeAll, afterAll, beforeEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { baseDbManager } from "../../instances.ts";
import { __targetName____GroupName__ } from "./__target-name__.ts";

describe("__targetName____GroupName__", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = baseDbManager.connect();
  });

  afterAll(() => {
    baseDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    baseDbManager.clearAllTablesForTests(dbKey);
  });

  // TODO: unskip this test
  it.skip("should execute successfully", async () => {
    const { result } = await __targetName____GroupName__(dbKey, {});
    expect(result).toBeDefined();
    assert(result);
    expect(result.name).toBe("test");
  });
});
