import { describe, expect, it } from "vitest";
import { testUserConfig } from "./user-config.ts";
import { TEST_USER_ID } from "../shared/defaults.ts";

describe("testUserConfig", () => {
  it("fills required fields and applies overrides", () => {
    const row = testUserConfig({ displayName: "Ada" });
    expect(row.userId).toBe(TEST_USER_ID);
    expect(row.displayName).toBe("Ada");
    expect(row.marketingEmailsOptIn).toBe(false);
  });
});
