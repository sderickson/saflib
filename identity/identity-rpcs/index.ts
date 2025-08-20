import * as users from "./dist/users.ts";
import * as timestamp from "./dist/google/protobuf/timestamp.ts";
import { typedEnv } from "./env.ts";
import * as grpc from "@grpc/grpc-js";

/**
 * A stripped down type of the UsersClient, for easier mocking.
 */
export type LimitedUsersClient = Pick<users.UsersClient, "GetUserProfile">;

/**
 * The global UsersClient for the identity service.
 */
let usersClient: LimitedUsersClient = new users.UsersClient(
  `identity:${typedEnv.IDENTITY_SERVICE_GRPC_PORT}`,
  grpc.credentials.createInsecure(),
);

if (typedEnv.NODE_ENV === "test") {
  usersClient = {
    GetUserProfile: async (_request: users.GetUserProfileRequest) => {
      return new users.GetUserProfileResponse({
        profile: new users.UserProfile({
          name: "Test User",
          email: "test@test.com",
          email_verified: true,
          given_name: "Test",
          family_name: "User",
          created_at: new timestamp.Timestamp({
            seconds: 1718239200,
            nanos: 0,
          }),
        }),
      });
    },
  };
}

export { users, timestamp, usersClient };
