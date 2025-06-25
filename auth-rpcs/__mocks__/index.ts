export * from "../index.ts";

const now = Date.now();

export class UsersClient {
  constructor(private readonly client: any) {}

  GetUserProfile = async () => {
    return {
      profile: {
        user_id: 1,
        email: "test@example.com",
        email_verified: true,
        name: "Test User",
        given_name: "Test",
        family_name: "User",
        created_at: {
          seconds: now / 1000,
          nanos: 0,
        },
      },
    };
  };
}
