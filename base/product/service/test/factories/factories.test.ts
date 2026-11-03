import { describe, expect, it } from "vitest";
import { testUserConfig } from "./user-config.ts";
import { TEST_USER_ID } from "../shared/defaults.ts";

describe("testUserConfig", () => {
  it("fills required fields and applies overrides", () => {
    const row = testUserConfig({ display_name: "Ada" });
    expect(row.user_id).toBe(TEST_USER_ID);
    expect(row.display_name).toBe("Ada");
    expect(row.marketing_emails_opt_in).toBe(false);
  });
});
