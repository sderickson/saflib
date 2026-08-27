import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  assert,
} from "vitest";
import type { DbKey } from "@saflib/drizzle";

import { baseDbManager } from "#instances.ts";
import { userConfigTable } from "#schemas/user-config.ts";
import { getByUserIdUserConfig } from "./get-by-user-id.ts";

describe("getByUserIdUserConfig", () => {
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

  it("returns null when userId does not exist", async () => {
    const { result, error } = await getByUserIdUserConfig(dbKey, {
      userId: "nonexistent-id",
    });

    expect(error).toBeUndefined();
    expect(result).toBeNull();
  });

  it("returns the user_config row when it exists", async () => {
    const db = baseDbManager.get(dbKey)!;
    const now = new Date();
    const [inserted] = await db
      .insert(userConfigTable)
      .values({
        userId: "user-1",
        displayName: "Alex",
        marketingEmailsOptIn: true,
        marketingEmailsOptInAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    assert(inserted);

    const { result, error } = await getByUserIdUserConfig(dbKey, {
      userId: inserted.userId,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual(inserted);
  });
});
