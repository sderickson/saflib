import { vi } from "vitest";

export * from "../index.ts";

export const UsersClient = vi.fn().mockImplementation(() => {
  return {
    GetUserProfile: vi.fn().mockResolvedValue({
      profile: {
        user_id: 1,
        email: "test@example.com",
        email_verified: true,
        name: "Test User",
        created_at: {
          seconds: Date.now() / 1000,
          nanos: 0,
        },
      },
    }),
  };
});
