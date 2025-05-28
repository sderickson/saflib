// TODO: Import your request and response classes from your "@saflib/grpc-specs"-dependent package
// import { GetUserProfileRequest, GetUserProfileResponse } from "@your-org/rpcs";
// import { UnimplementedGetUserProfileService } from "@your-org/rpcs";
import { status } from "@grpc/grpc-js";
import { getSafContext } from "@saflib/node";
import { authServiceStorage } from "../../context.ts";
import { authDb } from "@saflib/auth-db";
import { GetUserProfileResponse, UserProfile } from "@saflib/auth-rpcs";

// TODO: Replace with proper type annotation once types are imported
// should be:
// export const handleGetUserProfile: UnimplementedGetUserProfileService["GetUserProfile"] = async (call, callback) => {
export const handleGetUserProfile = async (call: any, callback: any) => {
  const { log } = getSafContext();
  const request = call.request;

  try {
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
    const emailAuths = await authDb.emailAuth.getEmailAuthByUserIds(dbKey, [
      userId,
    ]);
    const emailAuth = emailAuths[0];

    if (!emailAuth) {
      callback({
        code: status.NOT_FOUND,
        message: "User profile not found",
      });
      return;
    }

    log.info("GetUserProfile handler executed successfully", { userId });

    // Create proper response with UserProfile
    const userProfile = new UserProfile({
      user_id: emailAuth.userId,
      email: emailAuth.email,
      email_verified: !!emailAuth.verifiedAt,
      name: undefined, // We don't have name in emailAuth, would need to join with users table
    });

    const response = new GetUserProfileResponse({
      profile: userProfile,
    });

    callback(null, response);
  } catch (error) {
    log.error("Error in GetUserProfile handler", error);
    callback({
      code: status.INTERNAL,
      message: "Internal server error",
    });
  }
};
