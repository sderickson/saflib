import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { templateFileDb } from "@template/file-db";
import { templateFile } from "./template-file.ts";

describe("templateFile", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = templateFileDb.connect();
  });

  afterEach(async () => {
    templateFileDb.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    // @ts-expect-error - TODO: remove this line and provide valid input
    const { result } = await templateFile(dbKey, {});
    expect(result).toBeDefined();
    assert(result);
    expect(result.name).toBe("test");
  });
});
