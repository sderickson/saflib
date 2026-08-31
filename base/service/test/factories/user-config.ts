import type { UserConfig } from "@saflib/base-spec/schemas/UserConfig";
import { TEST_TIMESTAMP, TEST_USER_ID } from "../shared/defaults.ts";

/** Minimal {@link UserConfig} for unit tests (SPA, SDK, HTTP). */
export function testUserConfig(
  overrides: Partial<UserConfig> = {},
): UserConfig {
  return {
    user_id: TEST_USER_ID,
    display_name: "Test User",
    marketing_emails_opt_in: false,
    marketing_emails_opt_in_at: null,
    terms_of_service_agreed_at: null,
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  };
}
