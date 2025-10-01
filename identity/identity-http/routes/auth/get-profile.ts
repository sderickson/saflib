import { createHandler } from "@saflib/express";
import createError from "http-errors";
import { authServiceStorage } from "@saflib/identity-common";
import { UserNotFoundError, usersDb } from "@saflib/identity-db";
import type { IdentityResponseBody } from "@saflib/identity-spec";
import { typedEnv } from "../../env.ts";

const adminEmails =
  typedEnv.IDENTITY_SERVICE_ADMIN_EMAILS?.split(",").map((email: string) =>
    email.trim(),
  ) || [];

export const getProfileHandler = createHandler(async (req, res) => {
  const { dbKey } = authServiceStorage.getStore()!;

  if (!req.isAuthenticated() || !req.user) {
    res
      .status(200)
      .json({} satisfies IdentityResponseBody["getUserProfile"][200]);
    return;
  }

  const user = req.user as Express.User;
  const { result, error } = await usersDb.getById(dbKey, user.id);

  if (error) {
    switch (true) {
      case error instanceof UserNotFoundError:
        throw createError(401, "User not found");
      default:
        throw error satisfies never;
    }
  }

  // Determine if user is admin
  const isEmailVerified = result.emailVerified ?? false;
  const isAdminEmail = adminEmails.includes(result.email);
  const isAdmin = isEmailVerified && isAdminEmail;

  const response = {
    id: result.id,
    email: result.email,
    emailVerified: result.emailVerified ?? false,
    name: result.name ?? undefined,
    givenName: result.givenName ?? undefined,
    familyName: result.familyName ?? undefined,
    createdAt: result.createdAt.toISOString(),
    isAdmin,
  } satisfies IdentityResponseBody["getUserProfile"][200];

  res.status(200).json(response);
});
