import * as argon2 from "argon2";
import { createHandler } from "@saflib/express";
import { type AuthResponse } from "@saflib/identity-spec";
import { authDb, TokenNotFoundError } from "@saflib/identity-db";
import { authServiceStorage } from "../../context.ts";
import { throwError } from "@saflib/monorepo";

export const resetPasswordHandler = createHandler(async (req, res) => {
  const { dbKey, callbacks } = authServiceStorage.getStore()!;
  const { token, newPassword } = req.body as {
    token: string;
    newPassword: string;
  };

  const { result: emailAuth, error } =
    await authDb.emailAuth.getByForgotPasswordToken(dbKey, token);
  if (error) {
    switch (true) {
      case error instanceof TokenNotFoundError:
        const errorResponse: AuthResponse["resetPassword"][400] = {
          message: "Invalid or expired token",
        };
        res.status(400).json(errorResponse);
        return;
      default:
        throw error satisfies never;
    }
  }
  if (
    !emailAuth.forgotPasswordTokenExpiresAt ||
    emailAuth.forgotPasswordTokenExpiresAt < new Date()
  ) {
    const errorResponse: AuthResponse["resetPassword"][400] = {
      message: "Invalid or expired token",
    };
    res.status(400).json(errorResponse);
    return;
  }

  const passwordHash = await argon2.hash(newPassword);

  await authDb.emailAuth.updatePassword(
    dbKey,
    emailAuth.userId,
    Buffer.from(passwordHash),
  );
  await authDb.emailAuth.clearForgotPasswordToken(dbKey, emailAuth.userId);

  if (callbacks && callbacks.onPasswordUpdated) {
    const user = await throwError(
      authDb.users.getById(dbKey, emailAuth.userId),
    );
    await callbacks.onPasswordUpdated(user);
  }

  const successResponse: AuthResponse["resetPassword"][200] = {
    success: true,
  };
  res.status(200).json(successResponse);
});
