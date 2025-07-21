import { randomBytes } from "crypto";
import { createHandler } from "@saflib/express";
import { type AuthResponse } from "@saflib/auth-spec";
import { authDb } from "@saflib/auth-db";
import { authServiceStorage } from "../../context.ts";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/auth-links";

export const forgotPasswordHandler = createHandler(async (req, res) => {
  const { email } = req.body as { email: string };
  const { dbKey } = authServiceStorage.getStore()!;
  const { result: user, error } = await authDb.users.getByEmail(dbKey, email);
  if (error) {
    const successResponse: AuthResponse["forgotPassword"][200] = {
      success: true,
      message: "If the email exists, a recovery email has been sent",
    };
    res.status(200).json(successResponse);
    return;
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
  const { callbacks } = authServiceStorage.getStore()!;
  if (callbacks.onPasswordReset) {
    await callbacks.onPasswordReset(user, resetUrl);
  }

  const successResponse: AuthResponse["forgotPassword"][200] = {
    success: true,
    message: "If the email exists, a recovery email has been sent",
  };
  res.status(200).json(successResponse);
});
