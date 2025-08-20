import { createHandler } from "@saflib/express";
import createError from "http-errors";
import { authServiceStorage } from "@saflib/identity-common";
import { authDb, UserNotFoundError } from "@saflib/identity-db";
import type { AuthResponse } from "@saflib/identity-spec";

export const getProfileHandler = createHandler(async (req, res) => {
  const { dbKey } = authServiceStorage.getStore()!;

  if (!req.isAuthenticated() || !req.user) {
    res.status(200).json({} satisfies AuthResponse["getUserProfile"][200]);
    return;
  }

  const user = req.user as Express.User;
  const { result, error } = await authDb.users.getById(dbKey, user.id);

  if (error) {
    switch (true) {
      case error instanceof UserNotFoundError:
        throw createError(401, "User not found");
      default:
        throw error satisfies never;
    }
  }

  const response = {
    id: result.id,
    email: result.email,
    emailVerified: result.emailVerified ?? false,
    name: result.name ?? undefined,
    givenName: result.givenName ?? undefined,
    familyName: result.familyName ?? undefined,
    createdAt: result.createdAt.toISOString(),
  } satisfies AuthResponse["getUserProfile"][200];

  res.status(200).json(response);
});
