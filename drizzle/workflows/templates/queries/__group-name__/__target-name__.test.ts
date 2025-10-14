import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { __serviceName__DbManager } from "../../instances.ts";
import { __targetName____GroupName__ } from "./__target-name__.ts";

describe("__targetName____GroupName__", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = __serviceName__DbManager.connect();
  });

  afterEach(async () => {
    __serviceName__DbManager.disconnect(dbKey);
  });

  // TODO: unskip this test
  it.skip("should execute successfully", async () => {
    const { result } = await __targetName____GroupName__(dbKey, {});
    expect(result).toBeDefined();
    assert(result);
    expect(result.name).toBe("test");
  });
});
