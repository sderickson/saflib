import * as argon2 from "argon2";
import { createHandler } from "@saflib/express";
import { type IdentityResponseBody } from "@saflib/identity-spec";
import { emailAuthDb, TokenNotFoundError, usersDb } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
import { throwError } from "@saflib/monorepo";

export const resetPasswordHandler = createHandler(async (req, res) => {
  const { dbKey, callbacks } = authServiceStorage.getStore()!;
  const { token, newPassword } = req.body as {
    token: string;
    newPassword: string;
  };

  const { result: emailAuth, error } =
    await emailAuthDb.getByForgotPasswordToken(dbKey, token);
  if (error) {
    switch (true) {
      case error instanceof TokenNotFoundError:
        const errorResponse: IdentityResponseBody["resetPassword"][400] = {
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
    const errorResponse: IdentityResponseBody["resetPassword"][400] = {
      message: "Invalid or expired token",
    };
    res.status(400).json(errorResponse);
    return;
  }

  const passwordHash = await argon2.hash(newPassword);

  await emailAuthDb.updatePassword(
    dbKey,
    emailAuth.userId,
    Buffer.from(passwordHash),
  );
  await emailAuthDb.clearForgotPasswordToken(dbKey, emailAuth.userId);

  if (callbacks && callbacks.onPasswordUpdated) {
    const user = await throwError(usersDb.getById(dbKey, emailAuth.userId));
    await callbacks.onPasswordUpdated({ user });
  }

  const successResponse: IdentityResponseBody["resetPassword"][200] = {
    success: true,
  };
  res.status(200).json(successResponse);
});
