import { randomBytes } from "crypto";
import { createHandler } from "@saflib/express";
import type { AuthResponse, AuthRequest } from "@saflib/identity-spec";
import { authDb, UserNotFoundError } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/identity-links";

export const forgotPasswordHandler = createHandler(async (req, res) => {
  const { email } = req.body as AuthRequest["forgotPassword"];
  const { dbKey, callbacks } = authServiceStorage.getStore()!;
  const { result: user, error } = await authDb.users.getByEmail(dbKey, email);

  const commonResponse: AuthResponse["forgotPassword"][200] = {
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

  await authDb.emailAuth.updateForgotPasswordToken(
    dbKey,
    user.id,
    token,
    expiresAt,
  );

  const resetUrl = linkToHref(authLinks.resetPassword, {
    params: { token },
  });

  if (callbacks.onPasswordReset) {
    await callbacks.onPasswordReset(user, resetUrl);
  }

  res.status(200).json(commonResponse);
});
