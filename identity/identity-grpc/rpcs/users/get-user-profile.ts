import { status } from "@grpc/grpc-js";
import { authServiceStorage } from "@saflib/identity-common";
import { identityDb } from "@saflib/identity-db";
import { users, timestamp } from "@saflib/identity-rpcs";

export const handleGetUserProfile: users.UnimplementedUsersService["GetUserProfile"] =
  async (call, callback) => {
    const request = call.request;

    const { dbKey } = authServiceStorage.getStore()!;

    // Get the user ID from the request
    const userId = request.user_id;
    if (!userId) {
      callback({
        code: status.INVALID_ARGUMENT,
        message: "User ID is required",
      });
      return;
    }

    // Get email auth by user ID
    const [emailAuths, user] = await Promise.all([
      identityDb.emailAuth.getEmailAuthByUserIds(dbKey, [userId]),
      identityDb.users.getById(dbKey, userId),
    ]);
    const emailAuth = emailAuths[0];

    if (!emailAuth || !user.result) {
      callback({
        code: status.NOT_FOUND,
        message: "User profile not found",
      });
      return;
    }

    // Create proper response with UserProfile
    const userProfile = new users.UserProfile({
      user_id: emailAuth.userId,
      email: emailAuth.email,
      email_verified: !!emailAuth.verifiedAt,
      name: user.result.name ?? undefined,
      given_name: user.result.givenName ?? undefined,
      family_name: user.result.familyName ?? undefined,
      created_at: new timestamp.Timestamp({
        seconds: user.result.createdAt.getTime() / 1000,
        nanos: 0,
      }),
    });

    const response = new users.GetUserProfileResponse({
      profile: userProfile,
    });

    callback(null, response);
  };
