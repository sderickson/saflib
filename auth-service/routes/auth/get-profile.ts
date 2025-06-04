import { createHandler } from "@saflib/express";
import createError from "http-errors";
import { authServiceStorage } from "../../context.ts";
import { authDb, UserNotFoundError } from "@saflib/auth-db";

export const getProfileHandler = createHandler(async (req, res) => {
  const { dbKey } = authServiceStorage.getStore()!;

  if (!req.isAuthenticated() || !req.user) {
    throw createError(401, "User not authenticated");
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
    name: result.name,
    givenName: result.givenName,
    familyName: result.familyName,
  };

  res.status(200).json(response);
});
