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

  it("inserts defaults when no row exists for userId", async () => {
    const { result, error } = await createIfMissingUserConfig(dbKey, {
      userId: "user-1",
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.userId).toBe("user-1");
    expect(result.displayName).toBe("");
    expect(result.marketingEmailsOptIn).toBe(false);
    expect(result.marketingEmailsOptInAt).toBeNull();
    expect(result.termsOfServiceAgreedAt).toBeNull();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);

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
        userId: "user-1",
        displayName: "Alex",
        marketingEmailsOptIn: true,
        marketingEmailsOptInAt: now,
        termsOfServiceAgreedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    assert(existing);

    const { result, error } = await createIfMissingUserConfig(dbKey, {
      userId: "user-1",
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual(existing);

    const rows = await db.select().from(userConfigTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.displayName).toBe("Alex");
    expect(rows[0]?.marketingEmailsOptIn).toBe(true);
  });
});
