import type { UserConfig } from "@saflib/base-spec/schemas/UserConfig";

/** Session user id the SDK fakes treat as the current user for user-config routes. */
export const MOCK_SESSION_USER_ID = "user_config_session";

export const MOCK_USER_CONFIG: UserConfig = {
  user_id: MOCK_SESSION_USER_ID,
  display_name: "Alex Rivera",
  marketing_emails_opt_in: false,
  marketing_emails_opt_in_at: null,
  terms_of_service_agreed_at: null,
  created_at: "2026-07-23T00:00:00.000Z",
  updated_at: "2026-07-23T12:30:00.000Z",
};

const initialMockUserConfigs: UserConfig[] = [MOCK_USER_CONFIG];

export const mockUserConfigs: UserConfig[] = JSON.parse(
  JSON.stringify(initialMockUserConfigs),
) as UserConfig[];

/** Restore mock array to its initial state. Call from tests (e.g. afterEach) if they mutate the mocks. */
export function resetMocks(): void {
  mockUserConfigs.length = 0;
  mockUserConfigs.push(
    ...(JSON.parse(JSON.stringify(initialMockUserConfigs)) as UserConfig[]),
  );
}

/** Find the session user's config, or insert lazy-create defaults and return it. */
export function ensureMockUserConfig(
  userId: string = MOCK_SESSION_USER_ID,
): UserConfig {
  const existing = mockUserConfigs.find((config) => config.user_id === userId);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const created: UserConfig = {
    user_id: userId,
    display_name: "",
    marketing_emails_opt_in: false,
    marketing_emails_opt_in_at: null,
    terms_of_service_agreed_at: null,
    created_at: now,
    updated_at: now,
  };
  mockUserConfigs.push(created);
  return created;
}
