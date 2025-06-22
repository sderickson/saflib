import { createHandler } from "@saflib/express";
import type { components } from "@saflib/auth-spec";
import createError from "http-errors";
import { authServiceStorage } from "../../context.ts";
import {
  authDb,
  UserNotFoundError,
  EmailAuthNotFoundError,
  EmailTakenError,
} from "@saflib/auth-db";

type ProfileUpdateRequest = components["schemas"]["ProfileUpdateRequest"];
type ProfileResponse = components["schemas"]["ProfileResponse"];

export const updateProfile = createHandler(async (req, res) => {
  const { dbKey } = authServiceStorage.getStore()!;
  const data: ProfileUpdateRequest = req.body || {};

  if (!req.isAuthenticated() || !req.user) {
    throw createError(401, "User not authenticated");
  }

  const user = req.user as Express.User;
  const currentUserId = user.id;

  // Get current user data to check if email is actually changing
  const { result: currentUser, error: getUserError } =
    await authDb.users.getById(dbKey, currentUserId);
  if (getUserError) {
    switch (true) {
      case getUserError instanceof UserNotFoundError:
        throw createError(401, "User not found");
      default:
        throw getUserError satisfies never;
    }
  }

  let updatedUser = currentUser;

  // Handle name fields updates if any are provided
  const nameFields = {
    name: data.name,
    givenName: data.givenName,
    familyName: data.familyName,
  };

  const hasNameUpdates = Object.values(nameFields).some(
    (value) => value !== undefined,
  );

  if (hasNameUpdates) {
    // Filter out undefined values
    const profileParams = Object.fromEntries(
      Object.entries(nameFields).filter(([_, value]) => value !== undefined),
    );

    const { result, error } = await authDb.users.updateProfile(
      dbKey,
      currentUserId,
      profileParams,
    );
    if (error) {
      switch (true) {
        case error instanceof UserNotFoundError:
          throw createError(404, "User not found");
        default:
          throw error satisfies never;
      }
    }
    updatedUser = result;
  }

  // Handle email update if provided and different from current email
  if (data.email && data.email !== currentUser.email) {
    const { error: emailError } = await authDb.emailAuth.updateEmail(
      dbKey,
      currentUserId,
      data.email,
    );
    if (emailError) {
      switch (true) {
        case emailError instanceof EmailAuthNotFoundError:
          throw createError(404, "Email auth not found");
        case emailError instanceof EmailTakenError:
          throw createError(409, "Email already in use");
        default:
          throw emailError satisfies never;
      }
    }

    // Update the user object with the new email (updateEmail updates both tables)
    updatedUser = {
      ...updatedUser,
      email: data.email,
      emailVerified: false,
    };
  }

  const response: ProfileResponse = {
    id: updatedUser.id,
    email: updatedUser.email,
    emailVerified: updatedUser.emailVerified ?? false,
    name: updatedUser.name,
    givenName: updatedUser.givenName,
    familyName: updatedUser.familyName,
  };

  res.status(200).json(response);
});
