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
      user_id: "user-1",
      display_name: "Alex",
      marketing_emails_opt_in: true,
    });

    const { result, error } = await clearMarketingEmailsOptIn(dbKey, {
      user_id: "user-1",
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.updated).toBe(true);

    const { result: row } = await getByUserIdUserConfig(dbKey, {
      user_id: "user-1",
    });
    assert(row);
    expect(row.marketing_emails_opt_in).toBe(false);
    expect(row.marketing_emails_opt_in_at).toBeNull();
    expect(row.display_name).toBe("Alex");
  });

  it("reports updated=false when no row exists", async () => {
    const { result, error } = await clearMarketingEmailsOptIn(dbKey, {
      user_id: "missing",
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.updated).toBe(false);
  });
});
