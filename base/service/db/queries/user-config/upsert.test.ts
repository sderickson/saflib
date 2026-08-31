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
import { upsertUserConfig } from "./upsert.ts";

describe("upsertUserConfig", () => {
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

  it("inserts a row when none exists", async () => {
    const { result, error } = await upsertUserConfig(dbKey, {
      user_id: "user-1",
      display_name: "Alex",
      marketing_emails_opt_in: false,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.user_id).toBe("user-1");
    expect(result.display_name).toBe("Alex");
    expect(result.marketing_emails_opt_in).toBe(false);
    expect(result.marketing_emails_opt_in_at).toBeNull();
  });

  it("trims display_name and updates marketing opt-in timestamps", async () => {
    const { result: created } = await upsertUserConfig(dbKey, {
      user_id: "user-1",
      display_name: "  Alex  ",
      marketing_emails_opt_in: false,
    });
    assert(created);
    expect(created.display_name).toBe("Alex");
    expect(created.marketing_emails_opt_in_at).toBeNull();

    const { result: optedIn } = await upsertUserConfig(dbKey, {
      user_id: "user-1",
      display_name: "Jordan",
      marketing_emails_opt_in: true,
    });
    assert(optedIn);
    expect(optedIn.display_name).toBe("Jordan");
    expect(optedIn.marketing_emails_opt_in_at).toBeInstanceOf(Date);
    expect(optedIn.created_at).toEqual(created.created_at);

    const { result: optedOut } = await upsertUserConfig(dbKey, {
      user_id: "user-1",
      display_name: "Jordan",
      marketing_emails_opt_in: false,
    });
    assert(optedOut);
    expect(optedOut.marketing_emails_opt_in_at).toBeNull();
  });

  it("sets terms_of_service_agreed_at once when agreeToTermsOfServiceNow is true", async () => {
    const { result: first } = await upsertUserConfig(dbKey, {
      user_id: "user-1",
      display_name: "Alex",
      marketing_emails_opt_in: false,
      agreeToTermsOfServiceNow: true,
    });
    assert(first);
    assert(first.terms_of_service_agreed_at);

    const agreedAt = first.terms_of_service_agreed_at;
    const { result: second } = await upsertUserConfig(dbKey, {
      user_id: "user-1",
      display_name: "Alex",
      marketing_emails_opt_in: false,
      agreeToTermsOfServiceNow: true,
    });
    assert(second);
    expect(second.terms_of_service_agreed_at).toEqual(agreedAt);
  });
});
