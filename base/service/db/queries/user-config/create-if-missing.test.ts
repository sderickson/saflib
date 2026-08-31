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
import { createIfMissingUserConfig } from "./create-if-missing.ts";

describe("createIfMissingUserConfig", () => {
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

  it("inserts defaults when no row exists for user_id", async () => {
    const { result, error } = await createIfMissingUserConfig(dbKey, {
      user_id: "user-1",
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.user_id).toBe("user-1");
    expect(result.display_name).toBe("");
    expect(result.marketing_emails_opt_in).toBe(false);
    expect(result.marketing_emails_opt_in_at).toBeNull();
    expect(result.terms_of_service_agreed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    const db = baseDbManager.get(dbKey)!;
    const rows = await db.select().from(userConfigTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(result);
  });

  it("returns the existing row without overwriting when called again", async () => {
    const db = baseDbManager.get(dbKey)!;
    const now = new Date();
    const [existing] = await db
      .insert(userConfigTable)
      .values({
        user_id: "user-1",
        display_name: "Alex",
        marketing_emails_opt_in: true,
        marketing_emails_opt_in_at: now,
        terms_of_service_agreed_at: null,
        created_at: now,
        updated_at: now,
      })
      .returning();
    assert(existing);

    const { result, error } = await createIfMissingUserConfig(dbKey, {
      user_id: "user-1",
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual(existing);

    const rows = await db.select().from(userConfigTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.display_name).toBe("Alex");
    expect(rows[0]?.marketing_emails_opt_in).toBe(true);
  });
});
