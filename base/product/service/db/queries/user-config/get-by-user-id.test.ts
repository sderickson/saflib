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

  it("returns null when user_id does not exist", async () => {
    const { result, error } = await getByUserIdUserConfig(dbKey, {
      user_id: "nonexistent-id",
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
        user_id: "user-1",
        display_name: "Alex",
        marketing_emails_opt_in: true,
        marketing_emails_opt_in_at: now,
        created_at: now,
        updated_at: now,
      })
      .returning();
    assert(inserted);

    const { result, error } = await getByUserIdUserConfig(dbKey, {
      user_id: inserted.user_id,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual(inserted);
  });
});
