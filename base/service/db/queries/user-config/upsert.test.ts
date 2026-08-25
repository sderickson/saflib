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

import { baseDbManager } from "../../instances.ts";
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
      userId: "user-1",
      displayName: "Alex",
      marketingEmailsOptIn: false,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.userId).toBe("user-1");
    expect(result.displayName).toBe("Alex");
    expect(result.marketingEmailsOptIn).toBe(false);
    expect(result.marketingEmailsOptInAt).toBeNull();
  });

  it("trims displayName and updates marketing opt-in timestamps", async () => {
    const { result: created } = await upsertUserConfig(dbKey, {
      userId: "user-1",
      displayName: "  Alex  ",
      marketingEmailsOptIn: false,
    });
    assert(created);
    expect(created.displayName).toBe("Alex");
    expect(created.marketingEmailsOptInAt).toBeNull();

    const { result: optedIn } = await upsertUserConfig(dbKey, {
      userId: "user-1",
      displayName: "Jordan",
      marketingEmailsOptIn: true,
    });
    assert(optedIn);
    expect(optedIn.displayName).toBe("Jordan");
    expect(optedIn.marketingEmailsOptInAt).toBeInstanceOf(Date);
    expect(optedIn.createdAt).toEqual(created.createdAt);

    const { result: optedOut } = await upsertUserConfig(dbKey, {
      userId: "user-1",
      displayName: "Jordan",
      marketingEmailsOptIn: false,
    });
    assert(optedOut);
    expect(optedOut.marketingEmailsOptInAt).toBeNull();
  });

  it("sets termsOfServiceAgreedAt once when agreeToTermsOfServiceNow is true", async () => {
    const { result: first } = await upsertUserConfig(dbKey, {
      userId: "user-1",
      displayName: "Alex",
      marketingEmailsOptIn: false,
      agreeToTermsOfServiceNow: true,
    });
    assert(first);
    assert(first.termsOfServiceAgreedAt);

    const agreedAt = first.termsOfServiceAgreedAt;
    const { result: second } = await upsertUserConfig(dbKey, {
      userId: "user-1",
      displayName: "Alex",
      marketingEmailsOptIn: false,
      agreeToTermsOfServiceNow: true,
    });
    assert(second);
    expect(second.termsOfServiceAgreedAt).toEqual(agreedAt);
  });
});
