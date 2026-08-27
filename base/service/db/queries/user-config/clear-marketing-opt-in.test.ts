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
import { clearMarketingEmailsOptIn } from "./clear-marketing-opt-in.ts";
import { upsertUserConfig } from "./upsert.ts";
import { getByUserIdUserConfig } from "./get-by-user-id.ts";

describe("clearMarketingEmailsOptIn", () => {
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

  it("clears opt-in on an existing row", async () => {
    await upsertUserConfig(dbKey, {
      userId: "user-1",
      displayName: "Alex",
      marketingEmailsOptIn: true,
    });

    const { result, error } = await clearMarketingEmailsOptIn(dbKey, {
      userId: "user-1",
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.updated).toBe(true);

    const { result: row } = await getByUserIdUserConfig(dbKey, {
      userId: "user-1",
    });
    assert(row);
    expect(row.marketingEmailsOptIn).toBe(false);
    expect(row.marketingEmailsOptInAt).toBeNull();
    expect(row.displayName).toBe("Alex");
  });

  it("reports updated=false when no row exists", async () => {
    const { result, error } = await clearMarketingEmailsOptIn(dbKey, {
      userId: "missing",
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.updated).toBe(false);
  });
});
