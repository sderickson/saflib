import type { UserConfig } from "@saflib/base-spec/schemas/UserConfig";
import { TEST_TIMESTAMP, TEST_USER_ID } from "../shared/defaults.ts";

/** Minimal {@link UserConfig} for unit tests (SPA, SDK, HTTP). */
export function testUserConfig(
  overrides: Partial<UserConfig> = {},
): UserConfig {
  return {
    userId: TEST_USER_ID,
    displayName: "Test User",
    marketingEmailsOptIn: false,
    marketingEmailsOptInAt: null,
    termsOfServiceAgreedAt: null,
    createdAt: TEST_TIMESTAMP,
    updatedAt: TEST_TIMESTAMP,
    ...overrides,
  };
}
