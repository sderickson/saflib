import { randomBytes } from "crypto";
import { createHandler } from "@saflib/express";
import type { AuthResponseBody, AuthRequestBody } from "@saflib/identity-spec";
import { usersDb, UserNotFoundError, emailAuthDb } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/auth-links";

export const forgotPasswordHandler = createHandler(async (req, res) => {
  const { email } = req.body as AuthRequestBody["forgotPassword"];
  const { dbKey, callbacks } = authServiceStorage.getStore()!;
  const { result: user, error } = await usersDb.getByEmail(dbKey, email);

  const commonResponse: AuthResponseBody["forgotPassword"][200] = {
    success: true,
    message: "If the email exists, a recovery email has been sent",
  };

  if (error) {
    switch (true) {
      case error instanceof UserNotFoundError:
        res.status(200).json(commonResponse);
        return;
      default:
        throw error satisfies never;
    }
  }

  const token = randomBytes(8).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  await emailAuthDb.updateForgotPasswordToken(dbKey, user.id, token, expiresAt);

  const resetUrl = linkToHref(authLinks.resetPassword, {
    params: { token },
  });

  if (callbacks.onPasswordReset) {
    await callbacks.onPasswordReset(user, resetUrl);
  }

  res.status(200).json(commonResponse);
});
